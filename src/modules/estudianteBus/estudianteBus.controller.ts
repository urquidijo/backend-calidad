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

@Controller('buses')
export class EstudianteBusController {
  constructor(private readonly svc: EstudianteBusService) {}

  @Post(':id/start')
  startRoute(@Param('id', ParseIntPipe) busId: number) {
    return this.svc.startRoute(busId);
  }

  @Post(':id/end')
  endRoute(@Param('id', ParseIntPipe) busId: number) {
    return this.svc.endRoute(busId);
  }

  @Post(':id/reset')
  resetRoute(@Param('id', ParseIntPipe) busId: number) {
    return this.svc.resetRoute(busId);
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
}

@Controller('students')
export class StudentBusController {
  constructor(private readonly svc: EstudianteBusService) {}

  @Get(':id/bus')
  async getBus(@Param('id', ParseIntPipe) studentId: number) {
    const bus = await this.svc.findBusByStudent(studentId);
    return { bus }; // 🔹 siempre devuelve un objeto { bus: ... }
  }
}
