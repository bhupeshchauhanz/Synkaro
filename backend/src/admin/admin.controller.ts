import { Controller, Get, Post, Delete, Param, Query, Res, UseGuards, SetMetadata, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

export const IS_ADMIN_KEY = 'isAdmin';
export const IsAdmin = () => SetMetadata(IS_ADMIN_KEY, true);

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @IsAdmin()
  async dashboard() {
    return this.admin.getDashboard();
  }

  @Get('users')
  @IsAdmin()
  async users(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.admin.getUsers(Number(page) || 1, Number(limit) || 20, search);
  }

  // NOTE: must be declared BEFORE `users/:id` so "export" isn't treated as an id.
  @Get('users/export')
  @IsAdmin()
  async exportUsers(@Res() res: Response): Promise<void> {
    const csv = await this.admin.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="synkaro-users.csv"');
    res.send(csv);
  }

  @Get('users/:id')
  @IsAdmin()
  async user(@Param('id') id: string) {
    return this.admin.getUserById(id);
  }

  @Delete('users/:id')
  @IsAdmin()
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('rooms')
  @IsAdmin()
  async rooms(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admin.getRooms(Number(page) || 1, Number(limit) || 20);
  }

  @Get('rooms/:id')
  @IsAdmin()
  async room(@Param('id') id: string) {
    return this.admin.getRoomById(id);
  }

  @Delete('rooms/:id')
  @IsAdmin()
  @HttpCode(HttpStatus.OK)
  async deleteRoom(@Param('id') id: string) {
    return this.admin.deleteRoom(id);
  }
}
