// src/modules/estudianteBus/estudianteBus.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EstudianteBusController } from './estudianteBus.controller';
import { EstudianteBusService } from './estudianteBus.service';

const serviceMock = {
  findBusByStudent: jest.fn(),
};

describe('EstudianteBusController', () => {
  let controller: EstudianteBusController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstudianteBusController],
      providers: [
        {
          provide: EstudianteBusService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<EstudianteBusController>(EstudianteBusController);
  });

  /* ========== GET /students/:studentId/bus ========== */

  it('debería envolver el resultado del service en { bus }', async () => {
    const bus = { id: 100, nombre: 'Ruta Norte' };
    (serviceMock.findBusByStudent as jest.Mock).mockResolvedValue(bus);

    const result = await controller.getBusForStudent(7);

    expect(serviceMock.findBusByStudent).toHaveBeenCalledWith(7);
    expect(result).toEqual({ bus });
  });

  it('debería devolver { bus: null } si el service devuelve null', async () => {
    (serviceMock.findBusByStudent as jest.Mock).mockResolvedValue(null);

    const result = await controller.getBusForStudent(10);

    expect(serviceMock.findBusByStudent).toHaveBeenCalledWith(10);
    expect(result).toEqual({ bus: null });
  });
});
