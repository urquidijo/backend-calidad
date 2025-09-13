// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser } from './decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const u = await this.auth.validateUser(dto.email, dto.password);
    if (!u) throw new UnauthorizedException('Credenciales inválidas');
    const access_token = this.auth.sign({ id: u.id, email: u.email, rol: u.rol });
    return { access_token, user: { id: u.id, email: u.email, rol: u.rol, nombre: u.nombre } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@AuthUser() user: any) {
    return { user };
  }
}
