import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';

// Mock del service
const mockUsuarioService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UsuarioController', () => {
  let controller: UsuarioController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioController],
      providers: [
        {
          provide: UsuarioService,
          useValue: mockUsuarioService,
        },
      ],
    }).compile();

    controller = module.get<UsuarioController>(UsuarioController);
  });

  // ------- create -------
  it('debería delegar en service.create y retornar el resultado', async () => {
    const dto = {
      rol: 'PADRE',
      email: 'test@test.com',
      password: '123456',
      nombre: 'Usuario Test',
      telefono: '77777777',
    };

    const created = { id: 1, rol: 'PADRE', email: dto.email };

    (mockUsuarioService.create as jest.Mock).mockResolvedValue(created);

    const result = await controller.create(dto as any);

    expect(mockUsuarioService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  // ------- findAll -------
  it('debería delegar en service.findAll y retornar la lista', async () => {
    const list = [
      { id: 1, email: 'u1@test.com' },
      { id: 2, email: 'u2@test.com' },
    ];

    (mockUsuarioService.findAll as jest.Mock).mockResolvedValue(list);

    const result = await controller.findAll();

    expect(mockUsuarioService.findAll).toHaveBeenCalled();
    expect(result).toEqual(list);
  });

  // ------- findOne -------
  it('debería delegar en service.findOne con el id correcto', async () => {
    const usuario = { id: 1, email: 'u1@test.com' };

    (mockUsuarioService.findOne as jest.Mock).mockResolvedValue(usuario);

    const result = await controller.findOne(1);

    expect(mockUsuarioService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(usuario);
  });

  // ------- update -------
  it('debería delegar en service.update con id y dto', async () => {
    const dto = { nombre: 'Nuevo Nombre' };
    const updated = { id: 1, email: 'u1@test.com', nombre: dto.nombre };

    (mockUsuarioService.update as jest.Mock).mockResolvedValue(updated);

    const result = await controller.update(1, dto as any);

    expect(mockUsuarioService.update).toHaveBeenCalledWith(1, dto);
    expect(result).toEqual(updated);
  });

  // ------- remove -------
  it('debería delegar en service.remove con el id correcto', async () => {
    const deleted = { id: 1, email: 'u1@test.com' };

    (mockUsuarioService.remove as jest.Mock).mockResolvedValue(deleted);

    const result = await controller.remove(1);

    expect(mockUsuarioService.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual(deleted);
  });
});
