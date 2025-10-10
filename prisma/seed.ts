import { PrismaClient, BusStatus } from "@prisma/client";
const prisma = new PrismaClient();

/* ======================== Utils ======================== */

const NOMBRES = [
  "Josué","Valentina","Mateo","Camila","Thiago","Isabella","Santiago","Sophia",
  "Benjamín","Mía","Lucas","Emma","Martina","Diego","Sebastián","Victoria","Emilia","Gabriel",
];
const CURSOS = [
  "1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria",
  "1º Secundaria","2º Secundaria","3º Secundaria","4º Secundaria","5º Secundaria","6º Secundaria",
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

/** Mueve aprox en metros desde un punto lat/lon (válido para distancias cortas) */
function offsetMeters(lat: number, lon: number, dNorthM: number, dEastM: number) {
  const dLat = dNorthM / 111_320; // ~ metros por grado
  const dLon = dEastM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lon: lon + dLon };
}

/** Crea N puntos “paradas” en línea (ligera curvatura), espaciados ~distM entre sí */
function buildRouteAroundSchool(schoolLat: number, schoolLon: number, nStops = 6, distM = 450) {
  const baseBearingDeg = randInt(0, 359); // rumbo aleatorio de salida
  const points: { lat: number; lon: number; nombre: string; orden: number }[] = [];
  for (let i = 0; i < nStops; i++) {
    // Pequeña variación para que no sea línea perfecta
    const jitterN = randInt(-40, 40);
    const jitterE = randInt(-40, 40);
    // Progresión a lo largo del rumbo base (norte/este aproximados)
    const stepNorth = Math.cos((baseBearingDeg * Math.PI) / 180) * distM * i + jitterN;
    const stepEast  = Math.sin((baseBearingDeg * Math.PI) / 180) * distM * i + jitterE;
    const p = offsetMeters(schoolLat, schoolLon, stepNorth, stepEast);
    points.push({ lat: p.lat, lon: p.lon, nombre: `Parada ${i + 1}`, orden: i + 1 });
  }
  // Garantiza que la primera parada sea “Colegio”
  points[0] = { lat: schoolLat, lon: schoolLon, nombre: "Colegio", orden: 1 };
  return points;
}

/** Genera un domicilio cerca de la ruta (dentro de un radio en metros) */
function randomHomeNearRoute(route: { lat: number; lon: number }[], radiusM = 200) {
  const p = route[randInt(1, Math.max(1, route.length - 1))]; // no la 1ra para evitar amontonamiento en el colegio
  const dn = randInt(-radiusM, radiusM);
  const de = randInt(-radiusM, radiusM);
  return offsetMeters(p.lat, p.lon, dn, de);
}

/* ======================== Seeders ======================== */

async function upsertColegios() {
  const colegios = [
    { nombre: "Colegio San Martín", direccion: "Av. Hernando Sanabria 3er anillo", lat: -17.777432834352478, lon: -63.201640488379 },
    { nombre: "Colegio Don Bosco",  direccion: "Av. Argentina 1er anillo",        lat: -17.79531010376036,  lon: -63.17478952529914 },
    { nombre: "Colegio Cristo Rey",  direccion: "1er anillo C. Velasco",           lat: -17.791659288491292, lon: -63.18245345301485 },
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

async function seedBusesConConductores(busesPorColegio = 3) {
  const colegios = await prisma.colegio.findMany({ where: { activo: true } });
  for (const col of colegios) {
    const prefix = makePrefix(col.nombre);
    for (let i = 0; i < busesPorColegio; i++) {
      // Conductor
      const conductorEmail = `conductor_${prefix}_B${i + 1}@school.test`;
      const conductor = await prisma.usuario.upsert({
        where: { email: conductorEmail },
        update: {},
        create: {
          rol: "CONDUCTOR",
          email: conductorEmail,
          hashPassword: "123456", // TODO: usar hash real
          nombre: `Conductor ${String.fromCharCode(65 + i)} - ${col.nombre}`,
          activo: true,
          colegioId: col.id,
        },
      });

      // Bus
      const busCodigo = `${prefix}-B${String(i + 1).padStart(2, "0")}`;
      await prisma.bus.upsert({
        where: { colegioId_codigo: { colegioId: col.id, codigo: busCodigo } },
        update: {
          nombre: `Ruta ${String.fromCharCode(65 + i)}`,
          placa: `PL-${col.id}${i + 1}`,
          conductorId: conductor.id,
          activo: true,
        },
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
    console.log(`🚌 ${col.nombre}: ${busesPorColegio} buses + conductores`);
  }
}

async function seedParadasYTelemetria() {
  const buses = await prisma.bus.findMany({
    where: { activo: true },
    include: { colegio: true },
  });

  for (const bus of buses) {
    const col = bus.colegio;
    if (!col?.lat || !col?.lon) continue;

    // Crea ruta de 6 paradas alrededor del colegio
    const ruta = buildRouteAroundSchool(col.lat, col.lon, 6, 480);

    // Paradas (upsert por (busId, orden))
    for (const p of ruta) {
      const uniqueKey = { busId_orden: { busId: bus.id, orden: p.orden } } as any;
      const data = {
        busId: bus.id,
        nombre: p.nombre,
        orden: p.orden,
        lat: p.lat,
        lon: p.lon,
        activa: true,
      };
      // como no tenemos @@unique(busId,orden) por defecto, usamos un find/create
      const existing = await prisma.parada.findFirst({ where: { busId: bus.id, orden: p.orden } });
      if (existing) {
        await prisma.parada.update({ where: { id: existing.id }, data });
      } else {
        await prisma.parada.create({ data });
      }
    }

    // Telemetría inicial del bus en la 1ra parada (colegio)
    await prisma.telemetriaBus.upsert({
      where: { busId: bus.id },
      update: { lat: ruta[0].lat, lon: ruta[0].lon, status: BusStatus.NO_INICIADA },
      create: { busId: bus.id, lat: ruta[0].lat, lon: ruta[0].lon, status: BusStatus.NO_INICIADA },
    });
  }
  console.log("📍 Paradas y telemetría inicial listas");
}

async function seedEstudiantesYAsignacionConDomicilio() {
  const colegios = await prisma.colegio.findMany({ where: { activo: true } });

  for (const col of colegios) {
    const buses = await prisma.bus.findMany({
      where: { colegioId: col.id, activo: true },
      orderBy: { id: "asc" },
      include: { paradas: { where: { activa: true }, orderBy: { orden: "asc" } } },
    });
    if (!buses.length) continue;

    let studentIndex = 1;
    for (const bus of buses) {
      // Ruta de este bus (para ubicar casas cerca)
      const route = bus.paradas.length
        ? bus.paradas.map(p => ({ lat: p.lat, lon: p.lon }))
        : [{ lat: col.lat!, lon: col.lon! }];

      for (let j = 0; j < 12; j++) {
        const nombre = NOMBRES[randInt(0, NOMBRES.length - 1)];
        const curso = CURSOS[randInt(0, CURSOS.length - 1)];
        const codigo = `${makePrefix(col.nombre)}-${String(studentIndex).padStart(3, "0")}`;

        // Genera una casa cerca de la ruta
        const home = randomHomeNearRoute(route, 220);

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
            homeLat: home.lat,
            homeLon: home.lon,
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
    console.log(`👧👦 ${col.nombre}: domicilios + asignaciones listas`);
  }
}

/* ======================== MAIN ======================== */

async function main() {
  await upsertColegios();
  await seedBusesConConductores(3);
  await seedParadasYTelemetria();                 // crea paradas + telemetría
  await seedEstudiantesYAsignacionConDomicilio(); // crea estudiantes con homeLat/homeLon
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
