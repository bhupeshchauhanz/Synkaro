import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Movie Night' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ enum: ['couple', 'friend'] })
  @IsIn(['couple', 'friend'])
  type!: 'couple' | 'friend';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  theme?: string;
}

export class JoinRoomDto {
  @ApiProperty({ example: 'ABCD12' })
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  inviteCode!: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  background?: string;
}

export class UpdateMyNicknameDto {
  @IsString()
  @MaxLength(24)
  nickname!: string;
}
