import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateOtp } from '../common/utils/invite-code.util';
import { sanitizeText } from '../common/utils/sanitize.util';
import type { GoogleProfilePayload } from './strategies/google.strategy';
import type { User } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;
const RESET_TTL_MINUTES = 30;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

interface ClientMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async signup(
    name: string,
    email: string,
    password: string,
  ): Promise<{ email: string; otpSent: boolean }> {
    const cleanName = sanitizeText(name);
    const cleanEmail = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      // If user exists via Google but no password, allow setting password (account merge)
      if (existing.googleId && !existing.passwordHash) {
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, emailVerified: true },
        });
        return { email: cleanEmail, otpSent: false };
      }
      throw new ConflictException({
        message: 'An account with this email already exists',
        code: 'EMAIL_TAKEN',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const username = await this.generateUniqueUsername(cleanName, cleanEmail);

    await this.prisma.user.create({
      data: {
        username,
        email: cleanEmail,
        passwordHash,
      },
    });

    await this.issueOtp(cleanEmail, 'verify');
    return { email: cleanEmail, otpSent: true };
  }

  async login(email: string, password: string, meta: ClientMeta): Promise<{
    user: User;
    tokens: IssuedTokens;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Require email verification before issuing tokens
    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Please verify your email before logging in. Check your inbox for the OTP.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const tokens = await this.issueTokens(user, meta);
    return { user, tokens };
  }

  async loginWithGoogle(
    profile: GoogleProfilePayload,
    meta: ClientMeta,
  ): Promise<{ user: User; tokens: IssuedTokens }> {
    const cleanEmail = profile.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      const username = await this.generateUniqueUsername(profile.name, cleanEmail);
      user = await this.prisma.user.create({
        data: {
          username,
          email: cleanEmail,
          googleId: profile.googleId,
          avatar: profile.picture,
          emailVerified: true,
        },
      });
      try {
        await this.mail.sendWelcome(cleanEmail, profile.name);
      } catch (err) {
        this.logger.warn(`Welcome email failed: ${(err as Error).message}`);
      }
    } else if (!user.googleId) {
      // Merge: existing email/password account links to Google
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          emailVerified: true,
          avatar: user.avatar ?? profile.picture,
        },
      });
    }

    const tokens = await this.issueTokens(user, meta);
    return { user, tokens };
  }

  async verifyEmail(email: string, otp: string): Promise<{ verified: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const record = await this.prisma.emailOtp.findFirst({
      where: { email: cleanEmail, purpose: 'verify', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException({ message: 'No active code found', code: 'OTP_NOT_FOUND' });
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException({ message: 'Verification code expired', code: 'OTP_EXPIRED' });
    }

    // Brute-force protection: track attempts in metadata
    const meta = (record as unknown as { metadata?: Record<string, unknown> }).metadata ?? {};
    const attempts = ((meta.attempts as number) ?? 0) + 1;
    if (attempts > OTP_MAX_ATTEMPTS) {
      await this.prisma.emailOtp.update({ where: { id: record.id }, data: { used: true } });
      throw new BadRequestException({
        message: 'Too many incorrect attempts. Please request a new code.',
        code: 'OTP_MAX_ATTEMPTS',
      });
    }

    if (!timingSafeEqual(Buffer.from(record.otp), Buffer.from(otp))) {
      // Increment attempt counter — merge with existing metadata, don't overwrite
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { metadata: { ...meta, attempts } } as never,
      });
      throw new BadRequestException({ message: 'Invalid code', code: 'OTP_INVALID' });
    }

    await this.prisma.$transaction([
      this.prisma.emailOtp.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.user.update({
        where: { email: cleanEmail },
        data: { emailVerified: true },
      }),
    ]);

    // Fetch user for welcome email (user was just verified above)
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user) {
      try {
        await this.mail.sendWelcome(cleanEmail, user.username);
      } catch (err) {
        this.logger.warn(`Welcome email failed: ${(err as Error).message}`);
      }
    }
    return { verified: true };
  }

  async resendOtp(email: string): Promise<{ sent: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return { sent: true }; // Don't leak account existence
    }
    if (user.emailVerified) {
      throw new BadRequestException({
        message: 'Email already verified',
        code: 'ALREADY_VERIFIED',
      });
    }

    // Cooldown: check if a recent OTP was issued within the last 60 seconds
    const recent = await this.prisma.emailOtp.findFirst({
      where: { email: cleanEmail, purpose: 'verify', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const secondsAgo = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsAgo < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsAgo);
        throw new BadRequestException({
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          code: 'OTP_COOLDOWN',
        });
      }
    }

    await this.issueOtp(cleanEmail, 'verify');
    return { sent: true };
  }

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

    // Constant-time response to prevent email enumeration via timing
    const delay = new Promise<void>((r) => setTimeout(r, 200));

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);

      await this.prisma.passwordResetToken.create({
        data: { email: cleanEmail, tokenHash, expiresAt },
      });

      const webUrl = this.config.get<string>('WEB_URL') ?? 'https://synkaro.bhupeshchauhan.in';
      const resetUrl = `${webUrl}/auth/reset-password?token=${rawToken}`;
      try {
        await this.mail.sendPasswordReset(cleanEmail, resetUrl);
      } catch (err) {
        this.logger.warn(`Reset email failed: ${(err as Error).message}`);
      }
    }

    await delay;
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException({
        message: 'Reset link is invalid or has expired',
        code: 'RESET_TOKEN_INVALID',
      });
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { email: record.email }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.refreshToken.updateMany({
        where: { user: { email: record.email }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { reset: true };
  }

  async refresh(rawRefreshToken: string, meta: ClientMeta): Promise<IssuedTokens> {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException({
        message: 'Refresh token is invalid',
        code: 'REFRESH_INVALID',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(record.user, meta);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    return user;
  }

  // ───────────────────────────────────────────

  private async issueTokens(user: User, meta: ClientMeta): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );
    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = createHash('sha256').update(refreshRaw).digest('hex');
    const refreshTtlRaw = this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
    const numMatch = refreshTtlRaw.match(/^(\d+)/);
    const num = numMatch ? Number(numMatch[1]) : 30;
    const isHours = /h/i.test(refreshTtlRaw) && !/d/i.test(refreshTtlRaw);
    const refreshTtlMs = isHours ? num * 60 * 60 * 1000 : num * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });
    return { accessToken, refreshToken: refreshRaw };
  }

  private async issueOtp(email: string, purpose: 'verify' | 'reset'): Promise<void> {
    // Atomic: mark old OTPs as used and create new one in a transaction
    const otp = generateOtp(6);
    await this.prisma.$transaction([
      this.prisma.emailOtp.updateMany({
        where: { email, purpose, used: false },
        data: { used: true },
      }),
      this.prisma.emailOtp.create({
        data: {
          email,
          otp,
          purpose,
          expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
        },
      }),
    ]);
    try {
      await this.mail.sendOtp(email, otp);
    } catch (err) {
      this.logger.warn(`OTP email failed: ${(err as Error).message}`);
    }
  }

  private async generateUniqueUsername(name: string, email: string): Promise<string> {
    const base =
      (name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 18) || 'user';
    let attempt = base;
    let suffix = 0;
    while (await this.prisma.user.findUnique({ where: { username: attempt } })) {
      suffix += 1;
      if (suffix > 5) {
        attempt = `${base}${randomBytes(2).toString('hex')}`;
      } else {
        attempt = `${base}${suffix}`;
      }
    }
    return attempt;
  }
}
