import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { EstudianteBusService } from './estudianteBus.service';

@Controller('students')
export class EstudianteBusController {
  constructor(private readonly svc: EstudianteBusService) {}

  @Get(':studentId/bus')
async getBusForStudent(@Param('studentId', ParseIntPipe) studentId: number) {
  const bus = await this.svc.findBusByStudent(studentId);
  return { bus: bus ?? null };
}

}
