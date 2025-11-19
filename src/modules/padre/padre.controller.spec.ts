import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PadreController } from './padre.controller';
import { PadreService } from './padre.service';

// Mock del service
const mockPadreService = {
  listChildren: jest.fn(),
  linkChild: jest.fn(),
};

describe('PadreController', () => {
  let controller: PadreController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PadreController],
      providers: [
        {
          provide: PadreService,
          useValue: mockPadreService,
        },
      ],
    }).compile();

    controller = module.get<PadreController>(PadreController);
  });

  // -------- list --------
  it('list: debería obtener padreId de req.user.sub y delegar en service', async () => {
    const padreId = 10;
    const req = { user: { sub: padreId } };
    const data = { items: [], total: 0 };

    (mockPadreService.listChildren as jest.Mock).mockResolvedValue(data);

    const result = await controller.list(req as any);

    expect(mockPadreService.listChildren).toHaveBeenCalledWith(padreId);
    expect(result).toEqual(data);
  });

  it('list: debería lanzar BadRequestException si no hay user.sub', async () => {
    const req = {}; // sin user

    await expect(controller.list(req as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPadreService.listChildren).not.toHaveBeenCalled();
  });

  // -------- link --------
  it('link: debería tomar padreId de req.user.sub y delegar en service.linkChild', async () => {
    const padreId = 7;
    const req = { user: { sub: padreId } };
    const dto = { studentId: 99, schoolId: 3 };
    const response = { linked: true };

    (mockPadreService.linkChild as jest.Mock).mockResolvedValue(response);

    const result = await controller.link(req as any, dto as any);

    expect(mockPadreService.linkChild).toHaveBeenCalledWith(padreId, dto);
    expect(result).toEqual(response);
  });

  it('link: debería lanzar BadRequestException si no hay user.sub', async () => {
    const req = {};
    const dto = { studentId: 99, schoolId: 3 };

    await expect(controller.link(req as any, dto as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPadreService.linkChild).not.toHaveBeenCalled();
  });
});
