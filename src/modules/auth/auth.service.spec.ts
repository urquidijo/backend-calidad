// src/modules/auth/auth.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';

// ---- Mock de bcrypt ----
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// ---- Mock de PrismaService (solo lo que usamos) ----
const prismaMock = {
  usuario: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaService;

// ---- Mock de JwtService ----
const jwtMock = {
  sign: jest.fn(),
} as unknown as JwtService;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ---------- validateUser ----------
  it('debería devolver null si el usuario no existe', async () => {
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.validateUser('no@existe.com', '123456');

    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'no@existe.com' },
      select: {
        id: true,
        email: true,
        rol: true,
        nombre: true,
        activo: true,
        hashPassword: true,
      },
    });
    expect(result).toBeNull();
  });

  it('debería devolver null si el usuario está inactivo', async () => {
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      rol: Rol.PADRE,
      nombre: 'Test',
      activo: false,
      hashPassword: 'hash',
    });

    const result = await service.validateUser('test@test.com', '123456');

    expect(result).toBeNull();
  });

  it('debería devolver null si no tiene hashPassword', async () => {
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      rol: Rol.PADRE,
      nombre: 'Test',
      activo: true,
      hashPassword: null,
    });

    const result = await service.validateUser('test@test.com', '123456');

    expect(result).toBeNull();
  });

  it('debería devolver null si la contraseña es incorrecta', async () => {
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      rol: Rol.PADRE,
      nombre: 'Test',
      activo: true,
      hashPassword: 'hash-real',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await service.validateUser('test@test.com', 'mala');

    expect(bcrypt.compare).toHaveBeenCalledWith('mala', 'hash-real');
    expect(result).toBeNull();
  });

  it('debería normalizar email y devolver usuario sin hash cuando credenciales son correctas', async () => {
    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      rol: Rol.PADRE,
      nombre: 'Test',
      activo: true,
      hashPassword: 'hash-real',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.validateUser('  TEST@test.com  ', '123456');

    // email normalizado
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@test.com' },
      select: {
        id: true,
        email: true,
        rol: true,
        nombre: true,
        activo: true,
        hashPassword: true,
      },
    });

    expect(result).toEqual({
      id: 1,
      email: 'test@test.com',
      rol: Rol.PADRE,
      nombre: 'Test',
      activo: true,
    }); // sin hashPassword
  });

  // ---------- sign ----------
  it('debería firmar el token con el payload correcto', () => {
    (jwtMock.sign as jest.Mock).mockReturnValue('jwt-token');

    const user = { id: 1, email: 't@test.com', rol: Rol.PADRE };
    const token = service.sign(user);

    expect(jwtMock.sign).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      rol: user.rol,
    });
    expect(token).toBe('jwt-token');
  });

  // ---------- register ----------
  it('debería lanzar BadRequestException si el email ya existe', async () => {
    const dto = {
      email: 'existe@test.com',
      password: '123456',
      nombre: 'Usuario',
      telefono: '77777777',
    };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 99,
      email: dto.email,
    });

    await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it('debería registrar un usuario nuevo y devolver token + user', async () => {
    const dto = {
      email: ' NUEVO@test.com ',
      password: '123456',
      nombre: 'Nuevo Usuario',
      telefono: '77777777',
    };

    (prismaMock.usuario.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-mock');

    const userCreated = {
      id: 1,
      email: 'nuevo@test.com',
      rol: Rol.PADRE,
      nombre: dto.nombre,
    };

    (prismaMock.usuario.create as jest.Mock).mockResolvedValue(userCreated);
    (jwtMock.sign as jest.Mock).mockReturnValue('token-123');

    const result = await service.register(dto);

    // email normalizado
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'nuevo@test.com' },
    });

    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
    expect(prismaMock.usuario.create).toHaveBeenCalledWith({
      data: {
        rol: Rol.PADRE,
        email: 'nuevo@test.com',
        hashPassword: 'hash-mock',
        nombre: dto.nombre,
        telefono: dto.telefono,
      },
      select: { id: true, email: true, rol: true, nombre: true },
    });

    expect(jwtMock.sign).toHaveBeenCalledWith({
      sub: userCreated.id,
      email: userCreated.email,
      rol: userCreated.rol,
    });

    expect(result).toEqual({
      access_token: 'token-123',
      user: userCreated,
    });
  });
});
