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

  // Obtener información completa del bus de un estudiante
  @Get(':studentId/bus')
  async getBusForStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    const bus = await this.svc.findBusByStudent(studentId);
    return { bus: bus ?? null };
  }

  // Actualizar ubicación de un bus (ej: desde app del conductor)
  @Patch('bus/:id/location')
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

  // Obtener solo la ubicación actual del bus
  @Get('bus/:id/location')
  async getBusLocation(@Param('id', ParseIntPipe) busId: number) {
    const bus = await this.svc.getBusLocation(busId);
    return { location: bus };
  }
}
