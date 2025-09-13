import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PadreService } from './padre.service';
import { AddHijoDto } from './dto/add-hijo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/decorators/user.decorator';

@Controller('padres')
@UseGuards(JwtAuthGuard)
export class PadreController {
  constructor(private readonly service: PadreService) {}

  @Post('hijos')
  addHijo(@AuthUser() user: { sub: number; rol: string }, @Body() dto: AddHijoDto) {
    return this.service.addHijo(user.sub, dto.estudianteId);
  }

  @Get('hijos')
  listHijos(@AuthUser() user: { sub: number; rol: string }) {
    return this.service.listHijos(user.sub);
  }
}
