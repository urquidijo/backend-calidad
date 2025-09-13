import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser } from './decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() _dto: LoginDto, @Request() req: any) {
    const token = this.auth.sign({ id: req.user.id, email: req.user.email, rol: req.user.rol });
    return { access_token: token, user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@AuthUser() user: any) {
    return { user };
  }
}
