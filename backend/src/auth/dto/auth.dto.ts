import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Bhupesh' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  password!: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  rememberMe?: boolean;
}

export class GoogleSignInDto {
  @ApiProperty({ description: 'Google ID token from client' })
  @IsString()
  idToken!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp!: string;
}

export class ResendOtpDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain a lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  newPassword!: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  avatar!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  dateOfBirth!: string | null;

  @ApiProperty() themePreference!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty() isAdmin!: boolean;
  @ApiProperty() createdAt!: Date;
}

export class AuthSuccessDto {
  @ApiProperty()
  user!: UserResponseDto;

  @ApiProperty({ description: 'Returned for non-cookie clients (mobile)' })
  accessToken?: string;

  @ApiProperty({ description: 'Returned for non-cookie clients (mobile)' })
  refreshToken?: string;
}
