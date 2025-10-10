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
import { UpdateBusStatusDto } from './dto/update-status.dto';

@Controller('buses') // con globalPrefix 'api' en main.ts => /api/buses/...
export class BusesController {
  constructor(private readonly service: BusesService) {}

   @Post(':id/ruta/generar')
  async generarRuta(
    @Param('id', ParseIntPipe) id: number,
    @Query('direction') direction: 'IDA' | 'VUELTA' = 'IDA',
  ) {
    return this.service.generarRutaDesdeCasas(id, direction);
  }

  @Get(':id/ruta')
  async getRuta(@Param('id', ParseIntPipe) id: number) {
    return this.service.getRuta(id);
  }

  @Get(':id/estudiantes')
  async getEstudiantes(@Param('id', ParseIntPipe) id: number) {
    return this.service.getEstudiantes(id);
  }

  @Get(':id/location')
  async getLocation(@Param('id', ParseIntPipe) id: number) {
    return this.service.getLocation(id);
  }

  @Post(':id/location')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async postLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusLocationDto,
  ) {
    return this.service.postLocation(id, dto);
  }

  @Post(':id/status')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async postStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusStatusDto,
  ) {
    return this.service.postStatus(id, dto);
  }
}
