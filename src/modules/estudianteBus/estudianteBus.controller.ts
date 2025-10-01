import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { EstudianteBusService } from './estudianteBus.service';

@Controller('students')
export class EstudianteBusController {
  constructor(private readonly svc: EstudianteBusService) {}

  @Get(':studentId/bus')
  async getBusForStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    const bus = await this.svc.findBusByStudent(studentId);
    return { bus: bus ?? null };
  }

  @Patch(':id/location')
  async updateBusLocation(
    @Param('id', ParseIntPipe) busId: number,
    @Body()
    body: { lat: number; lon: number; speedKph?: number; heading?: number },
  ) {
    if (typeof body.lat !== 'number' || typeof body.lon !== 'number') {
      throw new BadRequestException('lat y lon son requeridos');
    }
    return this.svc.updateBusLocation(busId, body);
  }
}
