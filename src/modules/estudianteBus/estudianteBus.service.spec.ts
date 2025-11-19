// src/modules/estudianteBus/estudianteBus.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstudianteBusService } from './estudianteBus.service';
import { PrismaService } from 'src/prisma/prisma.service';

// ---- Mock de PrismaService ----
const prismaMock = {
  estudiante: {
    findUnique: jest.fn(),
  },
  estudianteBus: {
    findFirst: jest.fn(),
  },
} as unknown as PrismaService;

describe('EstudianteBusService', () => {
  let service: EstudianteBusService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstudianteBusService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<EstudianteBusService>(EstudianteBusService);
  });

  /* ========== findBusByStudent ========== */

  it('debería lanzar NotFoundException si el estudiante no existe', async () => {
    (prismaMock.estudiante.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findBusByStudent(999)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.estudiante.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: { id: true, nombre: true, colegioId: true },
    });
  });

  it('debería devolver null si no hay asignación de bus', async () => {
    (prismaMock.estudiante.findUnique as jest.Mock).mockResolvedValue({
      id: 5,
      nombre: 'Estudiante X',
      colegioId: 1,
    });

    (prismaMock.estudianteBus.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await service.findBusByStudent(5);

    expect(prismaMock.estudianteBus.findFirst).toHaveBeenCalledWith({
      where: { estudianteId: 5 },
      include: {
        bus: {
          include: {
            conductor: { select: { id: true, nombre: true, telefono: true } },
            colegio: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(result).toBeNull();
  });

  it('debería devolver el bus normalizado cuando hay asignación', async () => {
    (prismaMock.estudiante.findUnique as jest.Mock).mockResolvedValue({
      id: 7,
      nombre: 'Ana',
      colegioId: 3,
    });

    const asign = {
      bus: {
        id: 100,
        codigo: 'BUS-01',
        nombre: 'Ruta Norte',
        placa: 'XYZ-123',
        colegioId: null,
        conductor: {
          id: 50,
          nombre: 'Carlos',
          telefono: '77777777',
        },
        colegio: {
          id: 3,
        },
      },
    };

    (prismaMock.estudianteBus.findFirst as jest.Mock).mockResolvedValue(asign);

    const result = await service.findBusByStudent(7);

    expect(result).toEqual({
      id: 100,
      codigo: 'BUS-01',
      nombre: 'Ruta Norte',
      placa: 'XYZ-123',
      route_name: 'Ruta Norte',
      driver_name: 'Carlos',
      driver_phone: '77777777',
      status: null,
      last_location: null,
      colegioId: 3, // viene por b.colegioId ?? b.colegio?.id ?? null
    });
  });
});
