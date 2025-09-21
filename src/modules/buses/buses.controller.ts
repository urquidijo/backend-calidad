import { Controller, Post, Get, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { BusesService } from "./buses.service";
import { CreateBusDto } from "./dto/create-bus.dto";

@Controller("schools/:schoolId/buses")
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  create(
    @Param("schoolId", ParseIntPipe) schoolId: number,
    @Body() dto: CreateBusDto,
  ) {
    return this.busesService.create(schoolId, dto);
  }

  @Get()
  findAll(
    @Param("schoolId", ParseIntPipe) schoolId: number,
    @Query("activo") activo?: string,
  ) {
    const activeBool = activo === undefined ? undefined : activo === "true";
    return this.busesService.findAll(schoolId, activeBool);
  }
}
