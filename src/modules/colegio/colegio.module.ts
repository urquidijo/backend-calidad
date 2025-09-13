import { Module } from "@nestjs/common";
import { ColegiosService } from "./colegio.service";
import { ColegiosController } from "./colegio.controller";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [ColegiosController],
  providers: [ColegiosService, PrismaService],
  exports: [ColegiosService],
})
export class ColegiosModule {}
