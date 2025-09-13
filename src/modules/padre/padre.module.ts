import { Module } from '@nestjs/common';
import { PadreController } from './padre.controller';
import { PadreService } from './padre.service';

@Module({
  controllers: [PadreController],
  providers: [PadreService],
  exports: [PadreService],
})
export class PadreModule {}
