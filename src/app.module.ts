import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { PadreModule } from './modules/padre/padre.module';
import { ColegiosModule } from './modules/colegio/colegio.module';
import { EstudianteModule } from './modules/estudiante/estudiante.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusesModule } from './modules/buses/buses.module';
import { EstudianteBusModule } from './modules/estudianteBus/estudianteBus.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EstudianteAdminModule } from './modules/estudiante-admin/estudiante-admin.module';
import { PadreEstudianteAdminModule } from './modules/padre-estudiante-admin/padre-estudiante-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsuarioModule,
    ColegiosModule,
    AuthModule,
    PadreModule,
    EstudianteModule,
    BusesModule,
    EstudianteBusModule,
    DashboardModule,
    EstudianteAdminModule,
    PadreEstudianteAdminModule,
  ],
})
export class AppModule {}
