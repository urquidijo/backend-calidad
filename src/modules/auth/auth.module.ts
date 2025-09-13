// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service'; // usa '@/prisma/prisma.service' si tienes path alias
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule, // asegúrate que en AppModule está isGlobal: true o importa aquí
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],            // 👈 importante
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        // si prefieres, valida aquí que no sea undefined:
        // secret: cfg.getOrThrow<string>('JWT_SECRET'),
        secret: cfg.get<string>('JWT_SECRET')!,     // non-null assertion
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES') ?? '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
