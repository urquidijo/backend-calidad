import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { BusSimulatorService } from './bus-simulator.service';

@Controller('schools/:schoolId/buses')
export class BusesController {
  constructor(
    private readonly busesService: BusesService,
    private readonly simulator: BusSimulatorService, // 👈 inyectamos simulador
  ) {}

  // Crear bus
  @Post()
  create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateBusDto,
  ) {
    return this.busesService.create(schoolId, dto);
  }

  // Listar buses
  @Get()
  findAll(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('activo') activo?: string,
  ) {
    const activeBool = activo === undefined ? undefined : activo === 'true';
    return this.busesService.findAll(schoolId, activeBool);
  }

  // Ruta de un bus (paradas)
  @Get(':id/ruta')
  async getRutaBus(@Param('id', ParseIntPipe) id: number) {
    return this.busesService.getRutaBus(id);
  }

  // 🚍 Simulación: iniciar ruta
  @Post(':id/start-sim')
  startSimulation(@Param('id', ParseIntPipe) busId: number) {
    return this.simulator.start(busId);
  }

  // 🚍 Simulación: detener ruta
  @Post(':id/stop-sim')
  stopSimulation(@Param('id', ParseIntPipe) busId: number) {
    this.simulator.stop(busId);
    return { message: `Simulación detenida para bus ${busId}` };
  }
}
