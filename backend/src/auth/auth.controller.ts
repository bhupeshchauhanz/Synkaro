import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  GoogleSignInDto,
  VerifyEmailDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthSuccessDto,
  UserResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

interface CookieOpts {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
  maxAge: number;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign up with email + password and trigger OTP email' })
  async signup(@Body() dto: SignupDto): Promise<{ email: string; otpSent: boolean }> {
    return this.auth.signup(dto.name, dto.email, dto.password);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email + password login. Sets httpOnly cookie.' })
  @ApiOkResponse({ type: AuthSuccessDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessDto> {
    const { user, tokens } = await this.auth.login(dto.email, dto.password, this.metaFrom(req));
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: this.toUserDto(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Google ID token (mobile + web SDK)' })
  async google(
    @Body() dto: GoogleSignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessDto> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException({
        message: 'Invalid Google token',
        code: 'GOOGLE_TOKEN_INVALID',
      });
    }
    const { user, tokens } = await this.auth.loginWithGoogle(
      {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email.split('@')[0],
        picture: payload.picture ?? null,
      },
      this.metaFrom(req),
    );
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: this.toUserDto(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyEmailDto): Promise<{ verified: boolean }> {
    return this.auth.verifyEmail(dto.email, dto.otp);
  }

  @Post('resend-otp')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resend(@Body() dto: ResendOtpDto): Promise<{ sent: boolean }> {
    return this.auth.resendOtp(dto.email);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() dto: ForgotPasswordDto): Promise<{ sent: boolean }> {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async reset(@Body() dto: ResetPasswordDto): Promise<{ reset: boolean }> {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refresh = this.extractRefresh(req);
    if (!refresh) {
      throw new UnauthorizedException({ message: 'No refresh token', code: 'REFRESH_MISSING' });
    }
    const tokens = await this.auth.refresh(refresh, this.metaFrom(req));
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(this.extractRefresh(req));
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    const full = await this.auth.getUserById(user.id);
    return this.toUserDto(full);
  }

  // Helpers ───────────────────────────────────────────────────

  private metaFrom(req: Request): { userAgent?: string; ipAddress?: string } {
    return {
      userAgent: (req.headers['user-agent'] as string) ?? undefined,
      ipAddress: (req.ip as string) ?? undefined,
    };
  }

  private extractRefresh(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    if (cookies && typeof cookies.refresh_token === 'string') return cookies.refresh_token;
    const auth = req.headers['x-refresh-token'];
    return typeof auth === 'string' ? auth : undefined;
  }

  private cookieBaseOpts(maxAge: number): CookieOpts {
    const secure = (this.config.get<string>('COOKIE_SECURE') ?? 'true') === 'true';
    const opts: CookieOpts = {
      httpOnly: true,
      secure,
      sameSite: secure ? 'strict' : 'lax',
      path: '/',
      maxAge,
    };
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    if (domain) opts.domain = domain;
    return opts;
  }

  private parseTtlToMs(raw: string, defaultMs: number): number {
    const num = Number(raw.match(/^(\d+)/)?.[1] ?? 0);
    if (num <= 0) return defaultMs;
    if (/h/i.test(raw) && !/d/i.test(raw)) return num * 60 * 60 * 1000;
    return num * 24 * 60 * 60 * 1000;
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const accessTtl = this.parseTtlToMs(this.config.get<string>('JWT_ACCESS_TTL') ?? '15m', 15 * 60 * 1000);
    const refreshTtl = this.parseTtlToMs(this.config.get<string>('JWT_REFRESH_TTL') ?? '30d', 30 * 24 * 60 * 60 * 1000);
    res.cookie('access_token', accessToken, this.cookieBaseOpts(accessTtl));
    res.cookie('refresh_token', refreshToken, this.cookieBaseOpts(refreshTtl));
  }

  private clearAuthCookies(res: Response): void {
    const opts = this.cookieBaseOpts(0);
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
  }

  private toUserDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      themePreference: user.themePreference,
      emailVerified: user.emailVerified,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };
  }
}
