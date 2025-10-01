// src/modules/buses/bus-simulator.controller.ts
import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { BusSimulatorService } from './bus-simulator.service';

@Controller('buses/:busId/simulator')
export class BusSimulatorController {
  constructor(private readonly simulator: BusSimulatorService) {}

  // 🔹 Iniciar simulación
  @Post('start')
  async start(@Param('busId', ParseIntPipe) busId: number) {
    await this.simulator.start(busId);
    return { message: `Simulación iniciada para bus ${busId}` };
  }

  // 🔹 Detener simulación
  @Post('stop')
  async stop(@Param('busId', ParseIntPipe) busId: number) {
    this.simulator.stop(busId);
    return { message: `Simulación detenida para bus ${busId}` };
  }
}
