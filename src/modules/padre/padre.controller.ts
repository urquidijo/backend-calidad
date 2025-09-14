import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { PadreService } from "./padre.service";
import { LinkStudentDto } from "./dto/link-student.dto";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard"; // ajusta ruta de tu guard

@Controller("parent/children")
@UseGuards(JwtAuthGuard)
export class PadreController {
  constructor(private readonly svc: PadreService) {}

  @Get()
  async list(@Request() req: any) {
    const padreId = req.user?.sub; // asumiendo JWT con { sub: userId }
    if (!padreId) throw new BadRequestException("No autenticado");
    return this.svc.listChildren(padreId);
  }

  @Post("link")
  async link(@Request() req: any, @Body() dto: LinkStudentDto) {
    const padreId = req.user?.sub;
    if (!padreId) throw new BadRequestException("No autenticado");
    return this.svc.linkChild(padreId, dto);
  }
}
