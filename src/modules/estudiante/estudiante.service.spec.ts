// src/modules/estudiante/estudiante.service.spec.ts
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EstudianteService } from "./estudiante.service";
import { PrismaService } from "src/prisma/prisma.service";

// ---- Mock de PrismaService ----
const prismaMock = {
  estudiante: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  estudianteBus: {
    findFirst: jest.fn(),
  },
} as unknown as PrismaService;

describe("EstudianteService", () => {
  let service: EstudianteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstudianteService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<EstudianteService>(EstudianteService);
  });

  /* ========== verificarEstudiante ========== */

  it("debería armar el where usando ci cuando viene en el query", async () => {
    const colegioId = 1;
    const q = { ci: " 123456  " } as any;

    const estudiante = {
      id: 10,
      nombre: "Juan",
      curso: "3ro A",
      colegioId,
    };

    (prismaMock.estudiante.findFirst as jest.Mock).mockResolvedValue(
      estudiante,
    );

    const result = await service.verificarEstudiante(colegioId, q);

    expect(prismaMock.estudiante.findFirst).toHaveBeenCalledWith({
      where: {
        colegioId,
        activo: true,
        ci: "123456",
      },
      select: {
        id: true,
        nombre: true,
        curso: true,
        colegioId: true,
      },
    });

    expect(result).toEqual(estudiante);
  });

  it("debería armar el where usando codigo cuando no hay ci pero sí codigo", async () => {
    const colegioId = 2;
    const q = { codigo: "  ABC123 " } as any;

    const estudiante = {
      id: 20,
      nombre: "Maria",
      curso: "4to B",
      colegioId,
    };

    (prismaMock.estudiante.findFirst as jest.Mock).mockResolvedValue(
      estudiante,
    );

    const result = await service.verificarEstudiante(colegioId, q);

    expect(prismaMock.estudiante.findFirst).toHaveBeenCalledWith({
      where: {
        colegioId,
        activo: true,
        codigo: "ABC123",
      },
      select: {
        id: true,
        nombre: true,
        curso: true,
        colegioId: true,
      },
    });

    expect(result).toEqual(estudiante);
  });

  it("debería devolver null si no encuentra ningún estudiante", async () => {
    const colegioId = 3;
    const q = { ci: "999999" } as any;

    (prismaMock.estudiante.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await service.verificarEstudiante(colegioId, q);

    expect(result).toBeNull();
  });

  /* ========== findBusByStudent ========== */

  it("debería lanzar NotFoundException si el estudiante no existe", async () => {
    (prismaMock.estudiante.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findBusByStudent(999)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.estudiante.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: { id: true, nombre: true, colegioId: true },
    });
  });

  it("debería devolver null si no hay asignación de bus", async () => {
    (prismaMock.estudiante.findUnique as jest.Mock).mockResolvedValue({
      id: 5,
      nombre: "Estudiante X",
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
      orderBy: { createdAt: "desc" },
    });

    expect(result).toBeNull();
  });

  it("debería devolver el bus normalizado cuando hay asignación", async () => {
    (prismaMock.estudiante.findUnique as jest.Mock).mockResolvedValue({
      id: 7,
      nombre: "Ana",
      colegioId: 3,
    });

    const asign = {
      busId: 100,
      bus: {
        id: 100,
        codigo: "BUS-01",
        nombre: "Ruta Norte",
        placa: "XYZ-123",
        colegioId: null,
        conductor: {
          id: 50,
          nombre: "Carlos",
          telefono: "77777777",
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
      codigo: "BUS-01",
      nombre: "Ruta Norte",
      placa: "XYZ-123",
      route_name: "Ruta Norte",
      driver_name: "Carlos",
      driver_phone: "77777777",
      status: null,
      last_location: null,
      colegioId: 3,
    });
  });
});
