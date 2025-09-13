import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EstudianteService } from './estudiante.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { LookupEstudianteDto } from './dto/lookup-estudiante.dto';

@Controller('estudiantes')
export class EstudianteController {
  constructor(private readonly service: EstudianteService) {}
  @Post()
  create(@Body() dto: CreateEstudianteDto) {
    return this.service.create(dto);
  }
  @Get('lookup')
  lookup(@Query() q: LookupEstudianteDto) {
    return this.service.lookup(q);
  }
}
