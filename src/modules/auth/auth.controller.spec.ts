// src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { Rol } from '@prisma/client';

const authServiceMock = {
  register: jest.fn(),
  validateUser: jest.fn(),
  sign: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ---------- register ----------
  it('debería delegar en AuthService.register', async () => {
    const dto = {
      email: 'test@test.com',
      password: '123456',
      nombre: 'Test',
      telefono: '77777777',
    } as any;

    const response = {
      access_token: 'token-123',
      user: { id: 1, email: dto.email, rol: Rol.PADRE, nombre: dto.nombre },
    };

    (authServiceMock.register).mockResolvedValue(response);

    const result = await controller.register(dto);

    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(response);
  });

  // ---------- login ----------
  it('debería hacer login y devolver token + user cuando las credenciales son válidas', async () => {
    const dto = { email: 't@test.com', password: '123456' } as any;

    const user = {
      id: 1,
      email: 't@test.com',
      rol: Rol.PADRE,
      nombre: 'Test Usuario',
    };

    (authServiceMock.validateUser).mockResolvedValue(user);
    (authServiceMock.sign).mockReturnValue('jwt-token');

    const result = await controller.login(dto);

    expect(authServiceMock.validateUser).toHaveBeenCalledWith(
      dto.email,
      dto.password,
    );
    expect(authServiceMock.sign).toHaveBeenCalledWith({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    expect(result).toEqual({
      access_token: 'jwt-token',
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre,
      },
    });
  });

  it('debería lanzar UnauthorizedException si las credenciales son inválidas', async () => {
    const dto = { email: 't@test.com', password: 'mala' } as any;

    (authServiceMock.validateUser).mockResolvedValue(null);

    await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
    expect(authServiceMock.sign).not.toHaveBeenCalled();
  });

  // ---------- profile ----------
  it('debería devolver el usuario en profile', () => {
    const user = {
      id: 1,
      email: 't@test.com',
      rol: Rol.PADRE,
      nombre: 'Test Usuario',
    };

    const result = controller.profile(user as any);

    expect(result).toEqual({ user });
  });
});
