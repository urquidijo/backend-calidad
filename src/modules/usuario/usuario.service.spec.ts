import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioService } from './usuario.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// ---- Mock de bcrypt ----
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// ---- Mock de PrismaService (solo la parte que usamos) ----
const prismaMock = {
  usuario: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaService;

describe('UsuarioService', () => {
  let service: UsuarioService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsuarioService>(UsuarioService);
  });

  // ---------- create ----------
  it('debería crear un usuario nuevo cuando el email no existe', async () => {
    const dto = {
      rol: 'PADRE',
      email: 'nuevo@test.com',
      password: '123456',
      nombre: 'Nuevo Usuario',
      telefono: '77777777',
    };

    // no existe usuario con ese email
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue(null);

    // hash del password
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-mock');

    const userCreated = {
      id: 1,
      rol: 'PADRE',
      email: dto.email,
      nombre: dto.nombre,
      telefono: dto.telefono,
      activo: true,
      createdAt: new Date(),
    };

    (prismaMock.usuario.create as jest.Mock).mockResolvedValue(userCreated);

    const result = await service.create(dto as any);

    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: dto.email },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
    expect(prismaMock.usuario.create).toHaveBeenCalledWith({
      data: {
        rol: dto.rol,
        email: dto.email,
        hashPassword: 'hash-mock',
        nombre: dto.nombre,
        telefono: dto.telefono,
      },
      select: {
        id: true,
        rol: true,
        email: true,
        nombre: true,
        telefono: true,
        activo: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(userCreated);
  });

  it('debería lanzar BadRequestException si el email ya existe', async () => {
    const dto = {
      rol: 'PADRE',
      email: 'existe@test.com',
      password: '123456',
      nombre: 'Usuario',
      telefono: '77777777',
    };

    // ya existe usuario
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 99,
      email: dto.email,
    });

    await expect(service.create(dto as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  // ---------- findAll ----------
  it('debería retornar todos los usuarios', async () => {
    const usuarios = [
      {
        id: 1,
        rol: 'PADRE',
        email: 'u1@test.com',
        nombre: 'U1',
        telefono: null,
        activo: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        rol: 'CONDUCTOR',
        email: 'u2@test.com',
        nombre: 'U2',
        telefono: '123',
        activo: true,
        createdAt: new Date(),
      },
    ];

    (prismaMock.usuario.findMany as jest.Mock).mockResolvedValue(usuarios);

    const result = await service.findAll();

    expect(prismaMock.usuario.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        rol: true,
        email: true,
        nombre: true,
        telefono: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(usuarios);
  });

  // ---------- findOne ----------
  it('debería retornar un usuario por id', async () => {
    const usuario = {
      id: 1,
      rol: 'PADRE',
      email: 'u1@test.com',
      nombre: 'U1',
      telefono: null,
      activo: true,
      createdAt: new Date(),
    };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue(usuario);

    const result = await service.findOne(1);

    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        rol: true,
        email: true,
        nombre: true,
        telefono: true,
        activo: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(usuario);
  });

  // ---------- update ----------
  it('debería actualizar un usuario', async () => {
    const dto = {
      nombre: 'Nombre Actualizado',
      telefono: '7654321',
    };

    const updated = {
      id: 1,
      rol: 'PADRE',
      email: 'u1@test.com',
      nombre: dto.nombre,
      telefono: dto.telefono,
      activo: true,
      createdAt: new Date(),
    };

    (prismaMock.usuario.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.update(1, dto as any);

    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: dto,
      select: {
        id: true,
        rol: true,
        email: true,
        nombre: true,
        telefono: true,
        activo: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(updated);
  });

  // ---------- remove ----------
  it('debería eliminar un usuario', async () => {
    const deleted = {
      id: 1,
      rol: 'PADRE',
      email: 'u1@test.com',
      nombre: 'U1',
      telefono: null,
      activo: true,
      createdAt: new Date(),
    };

    (prismaMock.usuario.delete as jest.Mock).mockResolvedValue(deleted);

    const result = await service.remove(1);

    expect(prismaMock.usuario.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(result).toEqual(deleted);
  });
});
