/**
 * ENTORNO DE PRUEBAS (E2E)
 * ------------------------
 * ESTE ARCHIVO:
 * ✔ Usa .env.test automáticamente
 * ✔ Verifica que DATABASE_URL apunte a la BD de tests
 * ✔ Limpia datos SOLO dentro de la BD de tests
 * ✔ Ejecuta flujos reales con Prisma + Supertest
 * ✔ NO TOCA tu BD original
 */

jest.setTimeout(30000); // Timeout aumentado por seguridad

// ------------------------------------------
// 1) Cargar .env.test ANTES de cualquier otra cosa
// ------------------------------------------
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// PROTECCIÓN ANTI BORRADO ACCIDENTAL 🚨
if (
  !process.env.DATABASE_URL ||
  !process.env.DATABASE_URL.includes('test') // <-- cambia si tu BD de test se llama distinto
) {
  throw new Error(
    `⚠️  ERROR: DATABASE_URL NO apunta a una BASE DE DATOS DE TEST.

Valor actual: ${process.env.DATABASE_URL}

Para evitar pérdida de datos reales, se aborta la ejecución.
Asegúrate de usar .env.test con una base separada.`
  );
}

// ------------------------------------------
// 2) Imports NestJS / Supertest / Prisma
// ------------------------------------------
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// ------------------------------------------
// 3) Inicio de pruebas E2E
// ------------------------------------------
describe('Integración (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // ------------------------------------------
  // BEFORE ALL
  // ------------------------------------------
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // se carga TODO tu backend real
    }).compile();

    app = moduleFixture.createNestApplication();

    // Pipes igual que en main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // LIMPIEZA INICIAL SOLO EN BD DE TEST
    await prisma.estudianteBus.deleteMany();
    await prisma.estudiante.deleteMany();
    await prisma.bus.deleteMany();
    await prisma.colegio.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.telemetriaBus.deleteMany();
  });

  // ------------------------------------------
  // AFTER ALL
  // ------------------------------------------
  afterAll(async () => {
    await prisma.$disconnect(); // cerramos prisma
    await app.close(); // cerramos Nest
  });

  // ------------------------------------------
  // TEST 1: Auth - register → login → profile (JWT)
  // ------------------------------------------
  it('Auth: debería registrar, loguear y acceder a /auth/profile con JWT', async () => {
    const uniqueSuffix = Date.now();
    const email = `test${uniqueSuffix}@mail.com`;
    const password = '123456';

    // 1) Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        nombre: 'Usuario Test',
        telefono: '77777777',
      })
      .expect(201);

    expect(registerRes.body.access_token).toBeDefined();
    expect(registerRes.body.user.email).toBe(email);

    // 2) Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const token = loginRes.body.access_token;
    expect(token).toBeDefined();

    // 3) Profile protegido con JwtAuthGuard
    const profileRes = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profileRes.body.user).toBeDefined();
    expect(profileRes.body.user.email).toBe(email);
  });

  // ------------------------------------------
  // TEST 2: Colegios + Estudiantes - verificar estudiante por código
  // ------------------------------------------
  it('Colegios + Estudiantes: debería verificar estudiante por código en un colegio', async () => {
    const uniqueSuffix = Date.now();

    // 1) crear colegio
    const colegio = await prisma.colegio.create({
      data: { nombre: `Colegio Verif ${uniqueSuffix}` },
    });

    // 2) crear estudiante activo con código único
    const estudiante = await prisma.estudiante.create({
      data: {
        codigo: `COD-${uniqueSuffix}`,
        nombre: 'Pedro Verificado',
        curso: '2do A',
        activo: true,
        colegio: {
          connect: { id: colegio.id },
        },
      },
    });

    // 3) llamar endpoint de verificación
    const res = await request(app.getHttpServer())
      .get(
        `/colegios/${colegio.id}/estudiantes/verificar?codigo=COD-${uniqueSuffix}`,
      )
      .expect(200);

    expect(res.body.estudiante).toBeDefined();
    expect(res.body.estudiante.id).toBe(estudiante.id);
    expect(res.body.estudiante.colegioId).toBe(colegio.id);
  });

  // ------------------------------------------
  // TEST 3: Students - obtener bus asignado a estudiante
  // ------------------------------------------
  it('Students: debería obtener bus asignado a estudiante (flujo completo)', async () => {
    const uniqueSuffix = Date.now();

    // 1) crear colegio
    const colegio = await prisma.colegio.create({
      data: { nombre: `Colegio X ${uniqueSuffix}` },
    });

    // 2) crear estudiante
    const estudiante = await prisma.estudiante.create({
      data: {
        codigo: `STU-${uniqueSuffix}`,
        nombre: 'Juan Bus',
        curso: '3ro',
        activo: true,
        colegio: {
          connect: { id: colegio.id },
        },
      },
    });

    // 3) crear bus
    const bus = await prisma.bus.create({
      data: {
        nombre: 'Ruta Norte',
        codigo: `BUS-${uniqueSuffix}`,
        placa: 'XYZ-999',
        colegio: {
          connect: { id: colegio.id },
        },
      },
    });

    // 4) asignar estudiante al bus
    await prisma.estudianteBus.create({
      data: {
        estudianteId: estudiante.id,
        busId: bus.id,
      },
    });

    // 5) llamada HTTP real al endpoint
    const res = await request(app.getHttpServer())
      .get(`/students/${estudiante.id}/bus`)
      .expect(200);

    // 6) validar respuesta
    expect(res.body.bus).toBeDefined();
    expect(res.body.bus.id).toBe(bus.id);
    expect(res.body.bus.nombre).toBe('Ruta Norte');
    expect(res.body.bus.codigo).toBe(`BUS-${uniqueSuffix}`);
  });

  // ------------------------------------------
  // TEST 4: Buses - obtener estudiantes del bus
  // ------------------------------------------
  it('Buses: debería listar estudiantes activos con coordenadas asignados a un bus', async () => {
    const uniqueSuffix = Date.now();

    // 1) colegio
    const colegio = await prisma.colegio.create({
      data: { nombre: `Colegio BusEst ${uniqueSuffix}` },
    });

    // 2) bus
    const bus = await prisma.bus.create({
      data: {
        nombre: 'Ruta Estudiantes',
        codigo: `RB-${uniqueSuffix}`,
        placa: 'AAA-111',
        colegio: {
          connect: { id: colegio.id },
        },
      },
    });

    // 3) estudiante con homeLat/homeLon
    const estudiante = await prisma.estudiante.create({
      data: {
        codigo: `COD-EST-${uniqueSuffix}`,
        nombre: 'Alumno Ruta',
        curso: '1ro B',
        activo: true,
        homeLat: -17.78,
        homeLon: -63.18,
        colegio: {
          connect: { id: colegio.id },
        },
      },
    });

    // 4) asignar estudiante al bus
    await prisma.estudianteBus.create({
      data: {
        estudianteId: estudiante.id,
        busId: bus.id,
      },
    });

    // 5) GET /buses/:id/estudiantes
    const res = await request(app.getHttpServer())
      .get(`/buses/${bus.id}/estudiantes`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const found = res.body.find(
      (e: any) => e.id === estudiante.id && e.nombre === 'Alumno Ruta',
    );
    expect(found).toBeDefined();
    expect(found.homeLat).toBe(-17.78);
    expect(found.homeLon).toBe(-63.18);
  });

  // ------------------------------------------
  // TEST 5: Buses - location usando TelemetriaBus (sin sim)
  // ------------------------------------------
  it('Buses: debería devolver ubicación desde TelemetriaBus', async () => {
    const uniqueSuffix = Date.now();

    // 1) colegio
    const colegio = await prisma.colegio.create({
      data: { nombre: `Colegio Loc ${uniqueSuffix}` },
    });

    // 2) bus
    const bus = await prisma.bus.create({
      data: {
        nombre: 'Ruta Location',
        codigo: `LOC-${uniqueSuffix}`,
        placa: 'LOC-111',
        colegio: {
          connect: { id: colegio.id },
        },
      },
    });

    // 3) telemetría actual
    await prisma.telemetriaBus.create({
      data: {
        busId: bus.id,
        lat: -17.80,
        lon: -63.20,
        heading: 90,
      },
    });

    // 4) GET /buses/:id/location
    const res = await request(app.getHttpServer())
      .get(`/buses/${bus.id}/location`)
      .expect(200);

    expect(res.body.simulated).toBe(false);
    expect(res.body.lat).toBe(-17.8);
    expect(res.body.lon).toBe(-63.2);
    expect(res.body.heading).toBe(90);
  });
});
