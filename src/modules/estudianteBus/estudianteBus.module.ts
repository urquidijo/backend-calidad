// src/modules/estudiante/estudiante.module.ts
import { Module } from "@nestjs/common";
import { EstudianteBusController } from "./estudianteBus.controller";
import { EstudianteBusService } from "./estudianteBus.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BusesModule } from "../buses/buses.module";

@Module({
  controllers: [EstudianteBusController],
  providers: [EstudianteBusService, PrismaService],
  exports: [EstudianteBusService],
  imports: [BusesModule],
})
export class EstudianteBusModule {}
