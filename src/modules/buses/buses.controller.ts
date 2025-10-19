import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query,
} from '@nestjs/common';
import { BusesService } from './buses.service';
import { StartSimDto } from './dto/start-sim.dto';

@Controller('buses')
export class BusesController {
  constructor(private readonly service: BusesService) {}

  /* ========== Lecturas básicas ========== */
  @Get(':id/estudiantes')
  getEstudiantes(@Param('id', ParseIntPipe) id: number) {
    return this.service.getEstudiantesDeBus(id);
  }

  // waypoints = [ ...CASAS..., COLEGIO ]
  @Get(':id/ruta-casas')
  async getRutaCasas(
    @Param('id', ParseIntPipe) id: number,
    @Query('startFrom') startFrom?: 'colegio' | 'primeraCasa',
  ) {
    return this.service.getRutaPorCasas(id, startFrom ?? 'primeraCasa');
  }

  @Get(':id/location')
  async getLocation(@Param('id', ParseIntPipe) id: number) {
    return this.service.getLocation(id);
  }

  /* ========== Simulación ========== */
  @Post(':id/sim/start')
  async startSim(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StartSimDto,
  ) {
    return this.service.startSimulation(id, body);
  }

  @Post(':id/sim/stop')
  async stopSim(@Param('id', ParseIntPipe) id: number) {
    return this.service.stopSimulation(id);
  }
}
