// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// async function main() {
//   const colegios = [
//     { nombre: "Colegio San Martín", direccion: "Av. Beni 4to anillo, Santa Cruz", lat: -17.7468, lon: -63.1830 },
//     { nombre: "Colegio Santa Ana",  direccion: "Av. Banzer 3er anillo, Santa Cruz", lat: -17.7562, lon: -63.1704 },
//     { nombre: "Colegio Marista La Paz", direccion: "C. 16 de Obrajes, La Paz", lat: -16.5419, lon: -68.0837 },
//     { nombre: "Colegio Don Bosco Cochabamba", direccion: "Av. América, Cochabamba", lat: -17.3849, lon: -66.1636 },
//     { nombre: "Colegio Cristo Rey", direccion: "Av. Grigotá, Santa Cruz", lat: -17.8082, lon: -63.1785 },
//   ];

//   for (const c of colegios) {
//     await prisma.colegio.upsert({
//       where: { nombre: c.nombre },
//       update: { direccion: c.direccion, lat: c.lat, lon: c.lon, activo: true },
//       create: { ...c, activo: true },
//     });
//   }
//   console.log("Seed: colegios listos ✅");
// }

// main()
//   .catch((e) => { console.error("Seed error:", e); process.exit(1); })
//   .finally(async () => { await prisma.$disconnect(); });
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function upsertColegios() {
  const colegios = [
    {
      nombre: "Colegio San Martín",
      direccion: "Av. Beni 4to anillo, Santa Cruz",
      lat: -17.7468,
      lon: -63.183,
    },
    {
      nombre: "Colegio Santa Ana",
      direccion: "Av. Banzer 3er anillo, Santa Cruz",
      lat: -17.7562,
      lon: -63.1704,
    },
    {
      nombre: "Colegio Marista La Paz",
      direccion: "C. 16 de Obrajes, La Paz",
      lat: -16.5419,
      lon: -68.0837,
    },
    {
      nombre: "Colegio Don Bosco Cochabamba",
      direccion: "Av. América, Cochabamba",
      lat: -17.3849,
      lon: -66.1636,
    },
    {
      nombre: "Colegio Cristo Rey",
      direccion: "Av. Grigotá, Santa Cruz",
      lat: -17.8082,
      lon: -63.1785,
    },
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

function makePrefix(nombre: string) {
  // Toma iniciales de las primeras 2–3 palabras para formar prefijo
  const parts = nombre
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3);
  const initials = parts.map((p) => p[0]).join("");
  return initials.toUpperCase();
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCI() {
  // CI 7–9 dígitos
  const len = randInt(7, 9);
  let s = "";
  for (let i = 0; i < len; i++) s += randInt(0, 9);
  return s;
}

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

async function seedEstudiantesPorColegio() {
  const colegios = await prisma.colegio.findMany({ where: { activo: true } });

  for (const col of colegios) {
    // construye los 10 códigos determinísticos por colegio
    const prefix = makePrefix(col.nombre); // p.ej. "CSM" para "Colegio San Martín"
    const target = 10;

    // crea payloads
    const payload = Array.from({ length: target }, (_, i) => {
      const index = i + 1;
      const codigo = `${prefix}-${String(index).padStart(3, "0")}`;
      const nombre = NOMBRES[(i + col.id) % NOMBRES.length]; // distribuye nombres
      const curso = CURSOS[(i + randInt(0, 3)) % CURSOS.length];
      const ci = randomCI();

      return {
        colegioId: col.id,
        codigo,
        ci,
        nombre,
        curso,
        activo: true,
      };
    });

    // createMany idempotente (respetará @@unique(colegioId,codigo))
    await prisma.estudiante.createMany({
      data: payload,
      skipDuplicates: true,
    });

    // (opcional) log: cuántos hay finalmente
    const count = await prisma.estudiante.count({ where: { colegioId: col.id } });
    console.log(`🏫 ${col.nombre}: ${count} estudiantes`);
  }
  console.log("✅ Estudiantes listos (10 por colegio)");
}

async function main() {
  await upsertColegios();
  await seedEstudiantesPorColegio();
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
