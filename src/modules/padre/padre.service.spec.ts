import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PadreService } from './padre.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Rol } from '@prisma/client';

// Mock parcial de PrismaService
const prismaMock = {
  padreEstudiante: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  usuario: {
    findUnique: jest.fn(),
  },
  estudiante: {
    findFirst: jest.fn(),
  },
} as unknown as PrismaService;

describe('PadreService', () => {
  let service: PadreService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PadreService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PadreService>(PadreService);
  });

  // -------- listChildren --------
  it('listChildren: debería devolver hijos mapeados y total', async () => {
    (prismaMock.padreEstudiante.findMany as jest.Mock).mockResolvedValue([
      {
        padreId: 10,
        estudianteId: 1,
        createdAt: new Date(),
        estudiante: {
          id: 1,
          nombre: 'Juan Pérez',
          curso: '1ro A',
          colegio: { nombre: 'Colegio X' },
        },
      },
    ]);

    const result = await service.listChildren(10);

    expect(prismaMock.padreEstudiante.findMany).toHaveBeenCalledWith({
      where: { padreId: 10 },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            curso: true,
            colegio: { select: { nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(result).toEqual({
      items: [
        {
          id: '1',
          nombre: 'Juan Pérez',
          grado: '1ro A',
          colegio: 'Colegio X',
        },
      ],
      total: 1,
    });
  });

  // -------- linkChild OK --------
  it('linkChild: debería vincular estudiante cuando todo es válido', async () => {
    const padreId = 5;
    const dto = { studentId: 99, schoolId: 3 };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: padreId,
      rol: Rol.PADRE,
      activo: true,
    });

    (prismaMock.estudiante.findFirst as jest.Mock).mockResolvedValue({
      id: dto.studentId,
      nombre: 'Ana López',
      curso: '2do B',
    });

    (prismaMock.padreEstudiante.create as jest.Mock).mockResolvedValue({
      padreId,
      estudianteId: dto.studentId,
    });

    const result = await service.linkChild(padreId, dto as any);

    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: padreId },
      select: { id: true, rol: true, activo: true },
    });

    expect(prismaMock.estudiante.findFirst).toHaveBeenCalledWith({
      where: { id: dto.studentId, colegioId: dto.schoolId, activo: true },
      select: { id: true, nombre: true, curso: true },
    });

    expect(prismaMock.padreEstudiante.create).toHaveBeenCalledWith({
      data: { padreId, estudianteId: dto.studentId },
    });

    expect(result).toEqual({
      linked: true,
      student: {
        id: String(dto.studentId),
        nombre: 'Ana López',
        grado: '2do B',
      },
    });
  });

  // -------- linkChild errores --------
  it('linkChild: debería lanzar BadRequestException si el padre no existe o está inactivo', async () => {
    const padreId = 5;
    const dto = { studentId: 99, schoolId: 3 };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.linkChild(padreId, dto as any)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaMock.estudiante.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.padreEstudiante.create).not.toHaveBeenCalled();
  });

  it('linkChild: debería lanzar BadRequestException si el rol no es PADRE', async () => {
    const padreId = 5;
    const dto = { studentId: 99, schoolId: 3 };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: padreId,
      rol: Rol.ADMIN_COLEGIO,
      activo: true,
    });

    await expect(service.linkChild(padreId, dto as any)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaMock.estudiante.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.padreEstudiante.create).not.toHaveBeenCalled();
  });

  it('linkChild: debería lanzar NotFoundException si el estudiante no existe en ese colegio', async () => {
    const padreId = 5;
    const dto = { studentId: 99, schoolId: 3 };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: padreId,
      rol: Rol.PADRE,
      activo: true,
    });

    (prismaMock.estudiante.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.linkChild(padreId, dto as any)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.padreEstudiante.create).not.toHaveBeenCalled();
  });
});
