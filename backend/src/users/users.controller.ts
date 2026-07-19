import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  Matches,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  themePreference?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s-]{6,20}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<unknown> {
    const full = await this.users.getById(user.id);
    return {
      id: full.id,
      username: full.username,
      email: full.email,
      avatar: full.avatar,
      bio: full.bio,
      phone: full.phone,
      address: full.address,
      dateOfBirth: full.dateOfBirth,
      themePreference: full.themePreference,
      emailVerified: full.emailVerified,
      createdAt: full.createdAt,
    };
  }

  @Patch('me')
  async update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<unknown> {
    const updated = await this.users.updateProfile(user.id, dto);
    return {
      id: updated.id,
      username: updated.username,
      bio: updated.bio,
      avatar: updated.avatar,
      phone: updated.phone,
      address: updated.address,
      dateOfBirth: updated.dateOfBirth,
      themePreference: updated.themePreference,
    };
  }
}
