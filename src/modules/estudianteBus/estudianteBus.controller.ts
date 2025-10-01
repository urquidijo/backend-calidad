import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { EstudianteBusService } from './estudianteBus.service';
import { BusSimulatorService } from '../buses/bus-simulator.service';

@Controller('buses')
export class EstudianteBusController {
  constructor(private readonly svc: EstudianteBusService,private readonly simulator: BusSimulatorService,) {}
  

// src/modules/estudiante/estudianteBus.controller.ts
@Post(':id/start')
async startRoute(@Param('id', ParseIntPipe) busId: number) {
  const bus = await this.svc.startRoute(busId);
  await this.simulator.start(busId); // 🚀 arranca simulación al iniciar ruta
  return { status: bus!.status, bus };
}


  @Post(':id/end')
  async endRoute(@Param('id', ParseIntPipe) busId: number) {
    const bus = await this.svc.endRoute(busId);
    return { status: bus!.status, bus };
  }

  @Post(':id/reset')
  async resetRoute(@Param('id', ParseIntPipe) busId: number) {
    const bus = await this.svc.resetRoute(busId);
    return { status: bus.status, bus };
  }

  @Patch(':id/location')
  updateLocation(
    @Param('id', ParseIntPipe) busId: number,
    @Body() body: { lat: number; lon: number },
  ) {
    return this.svc.updateBusLocation(busId, body);
  }

  @Get(':id/location')
  getLocation(@Param('id', ParseIntPipe) busId: number) {
    return this.svc.getBusLocation(busId);
  }

  @Get(':idStudent/bus')
  async getBus(@Param('idStudent', ParseIntPipe) studentId: number) {
    const bus = await this.svc.findBusByStudent(studentId);
    return { bus }; // 🔹 siempre devuelve un objeto { bus: ... }
  }
}
