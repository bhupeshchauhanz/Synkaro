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
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: input.username,
        bio: input.bio !== undefined ? sanitizeText(input.bio) : undefined,
        avatar: input.avatar,
        themePreference: input.themePreference,
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
