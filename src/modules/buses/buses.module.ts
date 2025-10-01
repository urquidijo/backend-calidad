import { Module } from "@nestjs/common";
import { BusesService } from "./buses.service";
import { BusesController } from "./buses.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { BusSimulatorService } from "./bus-simulator.service";
import { BusSimulatorController } from "./bus-simulator.controller";

@Module({
  controllers: [BusesController,BusSimulatorController],
  providers: [BusesService, PrismaService, BusSimulatorService],
})
export class BusesModule {}
