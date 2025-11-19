// src/modules/colegio/colegio.service.spec.ts
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ColegiosService } from "./colegio.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Colegio } from "@prisma/client";

// ---- Mock de PrismaService ----
const prismaMock = {
  colegio: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaService;

describe("ColegiosService", () => {
  let service: ColegiosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColegiosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ColegiosService>(ColegiosService);
  });

  /* ========== create ========== */

  it("debería crear un colegio con los campos normalizados", async () => {
    const dto = {
      nombre: "  Colegio Central  ",
      direccion: "  Av. Siempre Viva  ",
      lat: -17.8,
      lon: -63.2,
      activo: true,
    };

    const created: Colegio = {
      id: 1,
      nombre: "Colegio Central",
      direccion: "Av. Siempre Viva",
      lat: dto.lat,
      lon: dto.lon,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaMock.colegio.create as jest.Mock).mockResolvedValue(created);

    const result = await service.create(dto as any);

    expect(prismaMock.colegio.create).toHaveBeenCalledWith({
      data: {
        nombre: "Colegio Central",
        direccion: "Av. Siempre Viva",
        lat: dto.lat,
        lon: dto.lon,
        activo: true,
      },
    });
    expect(result).toEqual(created);
  });

  it("debería usar activo=true por defecto si no se envía", async () => {
    const dto = {
      nombre: " Colegio Norte ",
      direccion: undefined,
      lat: null,
      lon: null,
    };

    const created: Colegio = {
      id: 2,
      nombre: "Colegio Norte",
      direccion: null,
      lat: null,
      lon: null,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaMock.colegio.create as jest.Mock).mockResolvedValue(created);

    const result = await service.create(dto as any);

    expect(prismaMock.colegio.create).toHaveBeenCalledWith({
      data: {
        nombre: "Colegio Norte",
        direccion: undefined, // se mantiene undefined si no hay dirección
        lat: undefined,
        lon: undefined,
        activo: true,
      },
    });

    expect(result).toEqual(created);
  });

  /* ========== list ========== */

  it("list debería usar valores por defecto (skip 0, take 20, activo=true) sin search", async () => {
    const q = {} as any;

    const items: Colegio[] = [
      {
        id: 1,
        nombre: "Colegio A",
        direccion: "Dirección A",
        lat: null,
        lon: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        nombre: "Colegio B",
        direccion: "Dirección B",
        lat: null,
        lon: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const total = 2;

    (prismaMock.$transaction as jest.Mock).mockResolvedValue([items, total]);

    const result = await service.list(q);

    const expectedWhere = {
      activo: true,
    };

    expect(prismaMock.colegio.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      orderBy: { nombre: "asc" },
      skip: 0,
      take: 20,
    });
    expect(prismaMock.colegio.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });

    expect(result).toEqual({
      items,
      total,
      skip: 0,
      take: 20,
    });
  });

  it("list debería aplicar search, skip y take cuando se envían", async () => {
    const q = {
      search: "central",
      skip: 40,
      take: 10,
    } as any;

    const items: Colegio[] = [];
    const total = 0;

    (prismaMock.$transaction as jest.Mock).mockResolvedValue([items, total]);

    const result = await service.list(q);

    const expectedWhere = {
      activo: true,
      OR: [
        { nombre: { contains: "central", mode: "insensitive" } },
        { direccion: { contains: "central", mode: "insensitive" } },
      ],
    };

    expect(prismaMock.colegio.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      orderBy: { nombre: "asc" },
      skip: 40,
      take: 10,
    });
    expect(prismaMock.colegio.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });

    expect(result).toEqual({
      items,
      total,
      skip: 40,
      take: 10,
    });
  });

  /* ========== findOne ========== */

  it("findOne debería devolver el colegio cuando existe", async () => {
    const colegio = {
      id: 5,
      nombre: "Colegio X",
      direccion: "Calle Y",
      lat: -17.7,
      lon: -63.1,
    };

    (prismaMock.colegio.findUnique as jest.Mock).mockResolvedValue(colegio);

    const result = await service.findOne(5);

    expect(prismaMock.colegio.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        lat: true,
        lon: true,
      },
    });
    expect(result).toEqual(colegio);
  });

  it("findOne debería lanzar NotFoundException si el colegio no existe", async () => {
    (prismaMock.colegio.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});
