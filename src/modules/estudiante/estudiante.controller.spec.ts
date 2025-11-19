// src/modules/estudiante/estudiante.controller.spec.ts
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EstudianteController } from "./estudiante.controller";
import { EstudianteService } from "./estudiante.service";
import { VerifyStudentDto } from "./dto/verify-student.dto";

const serviceMock = {
  verificarEstudiante: jest.fn(),
  findBusByStudent: jest.fn(),
};

describe("EstudianteController", () => {
  let controller: EstudianteController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstudianteController],
      providers: [
        {
          provide: EstudianteService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<EstudianteController>(EstudianteController);
  });

  /* ========== GET /colegios/:colegioId/estudiantes/verificar ========== */

  it("debería lanzar BadRequestException si no se envía ni ci ni codigo", async () => {
    const q = {} as VerifyStudentDto;

    await expect(controller.verificar(1, q)).rejects.toThrow(
      BadRequestException,
    );

    expect(serviceMock.verificarEstudiante).not.toHaveBeenCalled();
  });

  it("debería delegar en svc.verificarEstudiante cuando se envía ci", async () => {
    const colegioId = 2;
    const q: VerifyStudentDto = { ci: "123456" };

    const estudiante = {
      id: 10,
      nombre: "Juan",
      curso: "3ro A",
      colegioId,
    };

    (serviceMock.verificarEstudiante as jest.Mock).mockResolvedValue(
      estudiante,
    );

    const result = await controller.verificar(colegioId, q);

    expect(serviceMock.verificarEstudiante).toHaveBeenCalledWith(
      colegioId,
      q,
    );
    expect(result).toEqual({ estudiante });
  });

  it("debería delegar en svc.verificarEstudiante cuando se envía codigo", async () => {
    const colegioId = 3;
    const q: VerifyStudentDto = { codigo: "ABC123" };

    const estudiante = {
      id: 20,
      nombre: "Maria",
      curso: "4to B",
      colegioId,
    };

    (serviceMock.verificarEstudiante as jest.Mock).mockResolvedValue(
      estudiante,
    );

    const result = await controller.verificar(colegioId, q);

    expect(serviceMock.verificarEstudiante).toHaveBeenCalledWith(
      colegioId,
      q,
    );
    expect(result).toEqual({ estudiante });
  });

  /* ========== GET /colegios/:colegioId/estudiantes/:studentId/bus ========== */

  it("getBusForStudent debería delegar en svc.findBusByStudent y envolver en { bus }", async () => {
    const bus = {
      id: 100,
      nombre: "Ruta Norte",
    };

    (serviceMock.findBusByStudent as jest.Mock).mockResolvedValue(bus);

    const result = await controller.getBusForStudent(7);

    expect(serviceMock.findBusByStudent).toHaveBeenCalledWith(7);
    expect(result).toEqual({ bus });
  });
});
