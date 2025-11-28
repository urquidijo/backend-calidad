import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ColegiosService } from "./colegio.service";
import { CreateColegioDto } from "./dto/create-colegio.dto";
import { QueryColegioDto } from "./dto/query-colegio.dto";
import { UpdateColegioDto } from "./dto/update-colegio.dto";

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

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const school = await this.svc.findOne(id);
    return { school };
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateColegioDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
