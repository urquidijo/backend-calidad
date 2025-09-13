import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ColegiosService } from "./colegio.service";
import { CreateColegioDto } from "./dto/create-colegio.dto";
import { QueryColegioDto } from "./dto/query-colegio.dto";

@Controller("schools") // 👈 tu frontend ya usa /schools
export class ColegiosController {
  constructor(private readonly svc: ColegiosService) {}

  @Post()
  // Agrega guards/roles si quieres (e.g., solo SUPERADMIN)
  create(@Body() dto: CreateColegioDto) {
    return this.svc.create(dto);
  }

  @Get()
  list(@Query() q: QueryColegioDto) {
    return this.svc.list(q);
  }
}
