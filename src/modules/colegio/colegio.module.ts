import { Module } from '@nestjs/common';
import { ColegioController } from './colegio.controller';
import { ColegioService } from './colegio.service';

@Module({
  controllers: [ColegioController],
  providers: [ColegioService],
  exports: [ColegioService],
})
export class ColegioModule {}
