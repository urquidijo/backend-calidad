import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { PadreModule } from './modules/padre/padre.module';
import { ColegiosModule } from './modules/colegio/colegio.module';
import { EstudianteModule } from './modules/estudiante/estudiante.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsuarioModule,
    ColegiosModule,
    AuthModule,
    PadreModule,
    EstudianteModule,
  ],
})
export class AppModule {}
