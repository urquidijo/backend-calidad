import { Module } from "@nestjs/common";
import { BusesService } from "./buses.service";
import { BusesController } from "./buses.controller";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [BusesController],
  providers: [BusesService, PrismaService],
  exports: [BusesService],
})
export class BusesModule {}
