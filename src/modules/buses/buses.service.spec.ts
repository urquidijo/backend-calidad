// src/modules/buses/buses.service.spec.ts
import { NotFoundException } from '@nestjs/common';

// ---- Mock de PrismaClient ANTES de importar el servicio ----
const prismaMock = {
  bus: {
    findUnique: jest.fn(),
  },
  parada: {
    findFirst: jest.fn(),
  },
  telemetriaBus: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
} as any;

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => prismaMock),
  };
});

// Ahora sí importamos el servicio (usará el prismaMock)
import { BusesService } from './buses.service';

describe('BusesService', () => {
  let service: BusesService;

  // para controlar los setInterval de la simulación
  let intervalCallback: (() => void) | null = null;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusesService();

    intervalCallback = null;

    // mock de setInterval para no dejar timers colgando
    // y poder disparar manualmente el tick
    global.setInterval = ((fn: any, _ms?: number) => {
      intervalCallback = fn;
      return 123 as any; // id ficticio
    }) as any;

    global.clearInterval = jest.fn();
  });

  afterEach(() => {
    // restaurar implementación original de los timers
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  /* ========== getEstudiantesDeBus ========== */

  it('debería lanzar NotFoundException si el bus no existe', async () => {
    (prismaMock.bus.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getEstudiantesDeBus(1)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.bus.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        estudiantes: { include: { estudiante: true } },
      },
    });
  });

  it('debería devolver sólo estudiantes activos con homeLat/homeLon', async () => {
    (prismaMock.bus.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      estudiantes: [
        {
          estudiante: {
            id: 10,
            nombre: 'Juan',
            activo: true,
            homeLat: -17.78,
            homeLon: -63.18,
          },
        },
        {
          estudiante: {
            id: 11,
            nombre: 'Inactivo',
            activo: false,
            homeLat: -17.7,
            homeLon: -63.1,
          },
        },
        {
          estudiante: {
            id: 12,
            nombre: 'Sin coords',
            activo: true,
            homeLat: null,
            homeLon: null,
          },
        },
      ],
    });

    const result = await service.getEstudiantesDeBus(1);

    expect(result).toEqual([
      {
        id: 10,
        nombre: 'Juan',
        homeLat: -17.78,
        homeLon: -63.18,
      },
    ]);
  });

  /* ========== getColegioFromBus ========== */

  it('debería lanzar NotFoundException si el bus no existe (colegio)', async () => {
    (prismaMock.bus.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getColegioFromBus(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('debería lanzar NotFoundException si el colegio no tiene coordenadas', async () => {
    (prismaMock.bus.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      colegio: {
        nombre: 'Colegio X',
        lat: null,
        lon: null,
      },
    });

    await expect(service.getColegioFromBus(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('debería devolver las coordenadas del colegio', async () => {
    (prismaMock.bus.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      colegio: {
        nombre: 'Colegio X',
        lat: -17.75,
        lon: -63.15,
      },
    });

    const result = await service.getColegioFromBus(1);

    expect(result).toEqual({
      lat: -17.75,
      lon: -63.15,
      nombre: 'Colegio X',
    });
  });

  /* ========== startSimulation / getLocation / stopSimulation ========== */

  it('startSimulation debería lanzar NotFoundException si no hay waypoints', async () => {
    // forzamos a que getRutaPorCasas devuelva 0 waypoints
    (service as any).getRutaPorCasas = jest.fn().mockResolvedValue({
      waypoints: [],
      distanceMeters: 0,
      polyline: [],
    });

    await expect(
      service.startSimulation(1, { minSpeed: 10 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('startSimulation debería inicializar simulación y getLocation leer del estado simulado', async () => {
    // Ruta simple con 2 puntos
    (service as any).getRutaPorCasas = jest.fn().mockResolvedValue({
      waypoints: [
        {
          tipo: 'CASA',
          id: 1,
          nombre: 'Casa 1',
          lat: -17.8,
          lon: -63.2,
        },
        {
          tipo: 'COLEGIO',
          nombre: 'Colegio X',
          lat: -17.75,
          lon: -63.15,
        },
      ],
      distanceMeters: 500,
      polyline: null, // forzamos a que use la línea recta entre waypoints
    });

    (prismaMock.telemetriaBus.upsert as jest.Mock).mockResolvedValue(null);

    const result = await service.startSimulation(99, {});

    expect(result.ok).toBe(true);
    expect(result.waypointsCount).toBe(2);
    expect(result.distanceMeters).toBe(500);
    expect(result.params).toBeDefined();

    // simulamos un tick de la simulación
    if (intervalCallback) {
      await intervalCallback();
    }

    const loc = await service.getLocation(99);

    expect(loc.simulated).toBe(true);
    expect(loc.lat).toBeDefined();
    expect(loc.lon).toBeDefined();
    expect(loc.heading).toBeDefined();
  });

  it('getLocation debería usar telemetría si no hay simulación activa', async () => {
    // no simulación => sims vacío
    (prismaMock.telemetriaBus.findUnique as jest.Mock).mockResolvedValue({
      busId: 5,
      lat: -17.9,
      lon: -63.21,
      heading: 45,
    });

    const loc = await service.getLocation(5);

    expect(prismaMock.telemetriaBus.findUnique).toHaveBeenCalledWith({
      where: { busId: 5 },
    });

    expect(loc).toEqual({
      lat: -17.9,
      lon: -63.21,
      heading: 45,
      at: expect.any(Number),
      simulated: false,
    });
  });

  it('getLocation debería lanzar NotFoundException si no hay sim ni telemetría', async () => {
    (prismaMock.telemetriaBus.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getLocation(123)).rejects.toThrow(NotFoundException);
  });

  it('stopSimulation siempre debería devolver { ok: true } aunque no haya sim activa', async () => {
    const res = await service.stopSimulation(999);
    expect(res).toEqual({ ok: true });
  });
});
