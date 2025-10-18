import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { BusesService } from './buses.service';
import { UpdateBusLocationDto } from './dto/update-location.dto';

type Direction = 'IDA' | 'VUELTA';

@Controller('buses') // con globalPrefix 'api' => /api/buses/...
export class BusesController {
  constructor(private readonly service: BusesService) {}

  /* ========= Lecturas ========= */

  // Lista básica de estudiantes asignados (con lat/lon de casa)
  @Get(':id/estudiantes')
  async getEstudiantes(@Param('id', ParseIntPipe) id: number) {
    return this.service.getEstudiantes(id);
  }

  // Ruta ordenada que pasa por casas de estudiantes (no persiste Paradas)
  // direction=IDA (casas -> colegio) | VUELTA (colegio -> casas)
  // includeSchool=true/false (por defecto true)
  @Get(':id/ruta')
  async getRutaFromHomes(
    @Param('id', ParseIntPipe) id: number,
    @Query('direction') direction: Direction = 'IDA',
    @Query('includeSchool') includeSchool?: string,
  ) {
    const withSchool = includeSchool === undefined ? true : includeSchool === 'true';
    return this.service.getRutaFromHomes(id, direction, withSchool);
  }

  // Última ubicación del bus
  @Get(':id/location')
  async getLocation(@Param('id', ParseIntPipe) id: number) {
    return this.service.getLocation(id);
  }

  /* ========= Escrituras ========= */

  // Actualizar ubicación del bus (telemetría + log)
  @Post(':id/location')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async postLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusLocationDto,
  ) {
    return this.service.postLocation(id, dto);
  }

}
