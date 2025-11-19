// src/modules/buses/buses.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';
import { StartSimDto } from './dto/start-sim.dto';

const serviceMock = {
  getEstudiantesDeBus: jest.fn(),
  getRutaPorCasas: jest.fn(),
  getLocation: jest.fn(),
  startSimulation: jest.fn(),
  stopSimulation: jest.fn(),
};

describe('BusesController', () => {
  let controller: BusesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusesController],
      providers: [
        {
          provide: BusesService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<BusesController>(BusesController);
  });

  /* ========== getEstudiantes ========== */

  it('getEstudiantes debería delegar en service.getEstudiantesDeBus', async () => {
    const expected = [{ id: 1, nombre: 'Juan' }];
    (serviceMock.getEstudiantesDeBus as jest.Mock).mockResolvedValue(
      expected,
    );

    const result = await controller.getEstudiantes(10);

    expect(serviceMock.getEstudiantesDeBus).toHaveBeenCalledWith(10);
    expect(result).toEqual(expected);
  });

  /* ========== getRutaCasas ========== */

  it('getRutaCasas debería usar startFrom por defecto = "primeraCasa"', async () => {
    const ruta = { waypoints: [], distanceMeters: 100, polyline: [] };
    (serviceMock.getRutaPorCasas as jest.Mock).mockResolvedValue(ruta);

    const result = await controller.getRutaCasas(5, undefined);

    expect(serviceMock.getRutaPorCasas).toHaveBeenCalledWith(
      5,
      'primeraCasa',
    );
    expect(result).toEqual(ruta);
  });

  it('getRutaCasas debería aceptar startFrom="colegio"', async () => {
    const ruta = { waypoints: [], distanceMeters: 100, polyline: [] };
    (serviceMock.getRutaPorCasas as jest.Mock).mockResolvedValue(ruta);

    const result = await controller.getRutaCasas(5, 'colegio');

    expect(serviceMock.getRutaPorCasas).toHaveBeenCalledWith(5, 'colegio');
    expect(result).toEqual(ruta);
  });

  /* ========== getLocation ========== */

  it('getLocation debería delegar en service.getLocation', async () => {
    const loc = { lat: -17.8, lon: -63.2 };
    (serviceMock.getLocation as jest.Mock).mockResolvedValue(loc);

    const result = await controller.getLocation(7);

    expect(serviceMock.getLocation).toHaveBeenCalledWith(7);
    expect(result).toEqual(loc);
  });

  /* ========== startSim ========== */

  it('startSim debería delegar en service.startSimulation', async () => {
    const dto: StartSimDto = {
      minSpeed: 10,
      maxSpeed: 30,
      accel: 1.5,
      decel: 2,
      brakeDist: 70,
      dwellCasa: 2,
      dwellColegio: 30,
      tickMs: 60,
      recomputeOrder: false,
    };

    const resp = { ok: true, waypointsCount: 5 };
    (serviceMock.startSimulation as jest.Mock).mockResolvedValue(resp);

    const result = await controller.startSim(3, dto);

    expect(serviceMock.startSimulation).toHaveBeenCalledWith(3, dto);
    expect(result).toEqual(resp);
  });

  /* ========== stopSim ========== */

  it('stopSim debería delegar en service.stopSimulation', async () => {
    const resp = { ok: true };
    (serviceMock.stopSimulation as jest.Mock).mockResolvedValue(resp);

    const result = await controller.stopSim(3);

    expect(serviceMock.stopSimulation).toHaveBeenCalledWith(3);
    expect(result).toEqual(resp);
  });
});
