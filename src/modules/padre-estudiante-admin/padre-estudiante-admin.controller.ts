import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { PadreEstudianteAdminService } from "./padre-estudiante-admin.service";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("admin/parent-children")
export class PadreEstudianteAdminController {
  constructor(private readonly svc: PadreEstudianteAdminService) {}

  // GET /admin/parent-children
  @Get()
  async listAll() {
    return this.svc.listAll();
  }

  // DELETE /admin/parent-children/:padreId/:estudianteId
  @Delete(":padreId/:estudianteId")
  async unlink(
    @Param("padreId", ParseIntPipe) padreId: number,
    @Param("estudianteId", ParseIntPipe) estudianteId: number
  ) {
    return this.svc.unlink(padreId, estudianteId);
  }
}
