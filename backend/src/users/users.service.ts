import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeText } from '../common/utils/sanitize.util';
import type { User } from '@prisma/client';

interface UpdateProfileInput {
  username?: string;
  bio?: string;
  avatar?: string;
  themePreference?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
}

const ALLOWED_THEMES = ['dark', 'light', 'midnight', 'soft-pink', 'lavender', 'sky-blue', 'peach'];
const MAX_AVATAR_LENGTH = 2000;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    if (input.username) {
      const taken = await this.prisma.user.findFirst({
        where: { username: input.username, NOT: { id: userId } },
      });
      if (taken) {
        throw new ConflictException({ message: 'Username taken', code: 'USERNAME_TAKEN' });
      }
    }
    // Sanitize avatar URL — strip any HTML and enforce length limit
    let avatar: string | null | undefined = input.avatar;
    if (avatar !== undefined) {
      avatar = sanitizeText(avatar).slice(0, MAX_AVATAR_LENGTH) || null;
    }
    // Validate theme preference
    let themePreference = input.themePreference;
    if (themePreference !== undefined && !ALLOWED_THEMES.includes(themePreference)) {
      themePreference = 'dark';
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: input.username,
        bio: input.bio !== undefined ? sanitizeText(input.bio) : undefined,
        avatar,
        themePreference,
        phone: input.phone !== undefined ? sanitizeText(input.phone) : undefined,
        address: input.address !== undefined ? sanitizeText(input.address) : undefined,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
    });
  }

  async getById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    return user;
  }
}
