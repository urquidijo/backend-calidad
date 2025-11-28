import { Controller, Get, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("admin")
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get("stats")
  async getStats() {
    return this.svc.getStats();
  }
}
