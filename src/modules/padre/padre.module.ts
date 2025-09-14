import { Module } from "@nestjs/common";
import { PadreController } from "./padre.controller";
import { PadreService } from "./padre.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [PadreController],
  providers: [PadreService, PrismaService],
  exports: [PadreService],
})
export class PadreModule {}
