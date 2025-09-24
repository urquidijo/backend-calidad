import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NOMBRES = [
  "Josué", "Valentina", "Mateo", "Camila", "Thiago", "Isabella",
  "Santiago", "Sophia", "Benjamín", "Mía", "Lucas", "Emma",
  "Martina", "Diego", "Sebastián", "Victoria", "Emilia", "Gabriel",
];
const CURSOS = [
  "1º Primaria", "2º Primaria", "3º Primaria", "4º Primaria",
  "5º Primaria", "6º Primaria", "1º Secundaria", "2º Secundaria",
  "3º Secundaria", "4º Secundaria", "5º Secundaria", "6º Secundaria",
];

function makePrefix(nombre: string) {
  const parts = nombre.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).slice(0, 3);
  return parts.map(p => p[0]).join("").toUpperCase();
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCI() {
  const len = randInt(7, 9);
  let s = "";
  for (let i = 0; i < len; i++) s += randInt(0, 9);
  return s;
}

// ====================================================================
// COLEGIOS
// ====================================================================
async function upsertColegios() {
  const colegios = [
    { nombre: "Colegio San Martín", direccion: "Av. Hernando Sanabria 3er anillo", lat: -17.777432834352478, lon: -63.201640488379 },
    { nombre: "Colegio Don Bosco", direccion: "Av. Argentina 1er anillo", lat: -17.79531010376036, lon: -63.17478952529914 },
    { nombre: "Colegio Cristo Rey", direccion: "1er anillo C. Velasco", lat: -17.791659288491292, lon: -63.18245345301485 },
  ];
  for (const c of colegios) {
    await prisma.colegio.upsert({
      where: { nombre: c.nombre },
      update: { direccion: c.direccion, lat: c.lat, lon: c.lon, activo: true },
      create: { ...c, activo: true },
    });
  }
  console.log("✅ Colegios listos");
}

// ====================================================================
// BUSES + CONDUCTORES
// ====================================================================
async function seedBusesConConductores(busesPorColegio = 3) {
  const colegios = await prisma.colegio.findMany({ where: { activo: true } });
  for (const col of colegios) {
    const prefix = makePrefix(col.nombre);
    for (let i = 0; i < busesPorColegio; i++) {
      // Crear conductor
      const conductorEmail = `conductor_${prefix}_B${i + 1}@school.test`;
      const conductor = await prisma.usuario.upsert({
        where: { email: conductorEmail },
        update: {},
        create: {
          rol: "CONDUCTOR",
          email: conductorEmail,
          hashPassword: "123456", // cambiar si quieres hash real
          nombre: `Conductor ${String.fromCharCode(65 + i)} - ${col.nombre}`,
          activo: true,
          colegioId: col.id,
        },
      });

      // Crear bus
      const busCodigo = `${prefix}-B${String(i + 1).padStart(2, "0")}`;
      await prisma.bus.upsert({
        where: { colegioId_codigo: { colegioId: col.id, codigo: busCodigo } },
        update: { nombre: `Ruta ${String.fromCharCode(65 + i)}`, placa: `PL-${col.id}${i + 1}`, conductorId: conductor.id },
        create: {
          colegioId: col.id,
          codigo: busCodigo,
          nombre: `Ruta ${String.fromCharCode(65 + i)}`,
          placa: `PL-${col.id}${i + 1}`,
          conductorId: conductor.id,
          activo: true,
        },
      });
    }
    console.log(`🏫 ${col.nombre}: ${busesPorColegio} buses + conductores creados`);
  }
}

// ====================================================================
// ESTUDIANTES + ASIGNACIÓN A BUSES
// ====================================================================
async function seedEstudiantesYAsignacion() {
  const colegios = await prisma.colegio.findMany({ where: { activo: true } });
  for (const col of colegios) {
    const buses = await prisma.bus.findMany({ where: { colegioId: col.id, activo: true }, orderBy: { id: "asc" } });
    if (!buses.length) continue;

    // 12 estudiantes por bus
    let studentIndex = 1;
    for (const bus of buses) {
      for (let j = 0; j < 12; j++) {
        const nombre = NOMBRES[randInt(0, NOMBRES.length - 1)];
        const curso = CURSOS[randInt(0, CURSOS.length - 1)];
        const codigo = `${makePrefix(col.nombre)}-${String(studentIndex).padStart(3, "0")}`;
        const estudiante = await prisma.estudiante.upsert({
          where: { colegioId_codigo: { colegioId: col.id, codigo } },
          update: {},
          create: {
            colegioId: col.id,
            codigo,
            nombre,
            ci: randomCI(),
            curso,
            activo: true,
          },
        });
        await prisma.estudianteBus.upsert({
          where: { estudianteId_busId: { estudianteId: estudiante.id, busId: bus.id } },
          update: {},
          create: { estudianteId: estudiante.id, busId: bus.id },
        });
        studentIndex++;
      }
    }
    console.log(`🔗 ${col.nombre}: ${studentIndex - 1} estudiantes creados y asignados a buses`);
  }
}

// ====================================================================
// MAIN
// ====================================================================
async function main() {
  await upsertColegios();
  await seedBusesConConductores(3);
  await seedEstudiantesYAsignacion();
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
