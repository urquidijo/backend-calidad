// src/modules/colegio/colegio.controller.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { ColegiosController } from "./colegio.controller";
import { ColegiosService } from "./colegio.service";
import { CreateColegioDto } from "./dto/create-colegio.dto";
import { QueryColegioDto } from "./dto/query-colegio.dto.ts";

const serviceMock = {
  create: jest.fn(),
  list: jest.fn(),
  findOne: jest.fn(),
};

describe("ColegiosController", () => {
  let controller: ColegiosController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColegiosController],
      providers: [
        {
          provide: ColegiosService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<ColegiosController>(ColegiosController);
  });

  /* ========== POST /schools ========== */

  it("create debería delegar en svc.create", async () => {
    const dto: CreateColegioDto = {
      nombre: "Colegio Central",
      direccion: "Av. Siempre Viva",
      lat: -17.8,
      lon: -63.2,
      activo: true,
    };

    const created = { id: 1, ...dto };

    (serviceMock.create as jest.Mock).mockResolvedValue(created);

    const result = await controller.create(dto);

    expect(serviceMock.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  /* ========== GET /schools ========== */

  it("list debería delegar en svc.list", async () => {
    const q: QueryColegioDto = {
      search: "central",
      skip: 0,
      take: 10,
    };

    const resp = {
      items: [],
      total: 0,
      skip: 0,
      take: 10,
    };

    (serviceMock.list as jest.Mock).mockResolvedValue(resp);

    const result = await controller.list(q);

    expect(serviceMock.list).toHaveBeenCalledWith(q);
    expect(result).toEqual(resp);
  });

  /* ========== GET /schools/:id ========== */

  it("findOne debería devolver { school } y delegar en svc.findOne", async () => {
    const school = {
      id: 10,
      nombre: "Colegio X",
      direccion: "Calle Y",
      lat: -17.7,
      lon: -63.1,
    };

    (serviceMock.findOne as jest.Mock).mockResolvedValue(school);

    const result = await controller.findOne(10);

    expect(serviceMock.findOne).toHaveBeenCalledWith(10);
    expect(result).toEqual({ school });
  });
});
