// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/* ======================== Config rápida ======================== */
const BUSES_POR_COLEGIO = 2;                  // Menos buses = datos más limpios
const ESTUDIANTES_POR_BUS = [5, 8];           // Rango [min, max]
const RUTA_PARADAS_INTERMEDIAS = 0;           // Paradas “fijas” extra entre casas (normalmente 0)
const DISTANCIA_ENTRE_CASAS_M = 550;          // Separación media entre “clusters” de casas
const RADIO_CASAS_M = 320;                    // Dispersión (radio) alrededor del corredor
const DIST_INICIO_DEPOSITO_M = [2200, 3800];  // El depósito (inicio de ruta) desde el colegio
const NOMBRES = [
  "Valentina","Mateo","Camila","Thiago","Isabella","Santiago","Luciana","Benjamín","Mía","Lucas",
  "Emma","Martina","Diego","Sebastián","Victoria","Emilia","Gabriel","Antonella","Samuel","Renata",
  "Agustín","Daniela","Bruno","Julieta","Matías","Zoe","Gael","Regina","Alejandro","Abril",
];
const APELLIDOS = [
  "Suárez","Rojas","Mendoza","Vargas","Flores","Gutiérrez","Ríos","Pérez","Ortiz","Fernández",
  "Quispe","Romero","Ramírez","Vega","Soria","Rivero","Morales","Arce","López","Torrez",
  "Añez","Cruz","Aramayo","Montaño","Sandoval","Claros","Salazar","Aramayo","Villarroel","Arancibia",
];
const CURSOS = [
  "1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria",
  "1º Secundaria","2º Secundaria","3º Secundaria","4º Secundaria","5º Secundaria","6º Secundaria",
];

/* ======================== Utils ======================== */
function makePrefix(nombre: string) {
  const parts = nombre.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).slice(0, 3);
  return parts.map(p => p[0]).join("").toUpperCase();
}
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]) { return arr[randInt(0, arr.length - 1)]; }
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
function deg2rad(d: number) { return (d * Math.PI) / 180; }
function rad2deg(r: number) { return (r * 180) / Math.PI; }
/** Genera un punto a distancia D con rumbo (bearing) desde (lat,lon) */
function moveByBearing(lat: number, lon: number, distanceM: number, bearingDeg: number) {
  const dn = Math.cos(deg2rad(bearingDeg)) * distanceM;
  const de = Math.sin(deg2rad(bearingDeg)) * distanceM;
  return offsetMeters(lat, lon, dn, de);
}
/** Haversine (m) */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const la1 = deg2rad(lat1), la2 = deg2rad(lat2);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ======================== Lógica de ruta ======================== */
/**
 * Construye una ruta lógica: DEPOSITO (inicio) → casas ordenadas → colegio (fin)
 * - Se elige un rumbo base (bearing) y se ubica el depósito a 2–4 km del colegio.
 * - Se generan “clusters” de casas espaciados a lo largo del corredor; cada casa se dispersa en RADIO_CASAS_M.
 * - Las casas se ordenan por heurística NN simple desde el depósito con sesgo hacia el colegio.
 */
function buildLogicalRoute(
  schoolLat: number,
  schoolLon: number,
  nHouses: number,
) {
  const bearingBase = randInt(0, 359);

  // 1) Depósito (punto de salida)
  const depotDist = randInt(DIST_INICIO_DEPOSITO_M[0], DIST_INICIO_DEPOSITO_M[1]);
  const depot = moveByBearing(schoolLat, schoolLon, depotDist, bearingBase);

  // 2) Generar “marcas” de corredor entre depósito y colegio
  //    Posicionamos n clusters aproximadamente equiespaciados entre depósito y colegio
  const houses: { lat: number; lon: number }[] = [];
  for (let i = 1; i <= nHouses; i++) {
    // t en [0.15..0.85] para que queden entre el depósito y la escuela
    const t = i / (nHouses + 1);
    const alongM = depotDist * (1 - t); // desde depósito hacia el colegio
    const center = moveByBearing(schoolLat, schoolLon, alongM, bearingBase);
    // Dispersión alrededor del corredor
    const dn = randInt(-RADIO_CASAS_M, RADIO_CASAS_M);
    const de = randInt(-RADIO_CASAS_M, RADIO_CASAS_M);
    const home = offsetMeters(center.lat, center.lon, dn, de);
    houses.push(home);
  }

  // 3) Orden simple tipo nearest-neighbor desde el depósito
  const remaining = houses.map((h, idx) => ({ ...h, _i: idx }));
  const order: typeof remaining = [];
  let current = { lat: depot.lat, lon: depot.lon };
  while (remaining.length) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current.lat, current.lon, remaining[i].lat, remaining[i].lon);
      if (d < bestD) { bestD = d; best = i; }
    }
    const next = remaining.splice(best, 1)[0];
    order.push(next);
    current = { lat: next.lat, lon: next.lon };
  }

  // 4) Paradas finales: Depot (orden 1), casas (2..n+1), Colegio (última)
  const route = [
    { nombre: "Depósito", lat: depot.lat, lon: depot.lon },
    ...order.map((h, idx) => ({ nombre: `Parada Casa ${idx + 1}`, lat: h.lat, lon: h.lon })),
    { nombre: "Colegio", lat: schoolLat, lon: schoolLon },
  ];

  return route;
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

async function seedBusesConConductores(busesPorColegio = BUSES_POR_COLEGIO) {
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

async function seedRutasParadasTelemetria() {
  const buses = await prisma.bus.findMany({
    where: { activo: true },
    include: { colegio: true },
  });

  for (const bus of buses) {
    const col = bus.colegio;
    if (!col?.lat || !col?.lon) continue;

    // Cantidad de estudiantes target para el bus, usaremos para definir casas y paradas
    const nStudentsTarget = randInt(ESTUDIANTES_POR_BUS[0], ESTUDIANTES_POR_BUS[1]);

    // Construye ruta lógica (depot → casas → colegio)
    const route = buildLogicalRoute(col.lat, col.lon, nStudentsTarget);

    // Inserta paradas en orden
    for (let idx = 0; idx < route.length; idx++) {
      const p = route[idx];
      const orden = idx + 1;
      const existing = await prisma.parada.findFirst({ where: { busId: bus.id, orden } });
      const data = { busId: bus.id, nombre: p.nombre, orden, lat: p.lat, lon: p.lon, activa: true };
      if (existing) {
        await prisma.parada.update({ where: { id: existing.id }, data });
      } else {
        await prisma.parada.create({ data });
      }
    }

    // Telemetría: el bus arranca en el DEPÓSITO (parada 1)
    const start = route[0];
    await prisma.telemetriaBus.upsert({
      where: { busId: bus.id },
      update: { lat: start.lat, lon: start.lon /*, status: null*/ },
      create: { busId: bus.id, lat: start.lat, lon: start.lon /*, status: null*/ },
    });

    console.log(`🗺 Ruta para bus ${bus.codigo}: ${route.length} puntos (Depósito→Casas→Colegio)`);
  }
  console.log("📍 Paradas + telemetría inicial listas");
}

async function seedEstudiantesYAsignacion() {
  const colegios = await prisma.colegio.findMany({ where: { activo: true } });

  for (const col of colegios) {
    const buses = await prisma.bus.findMany({
      where: { colegioId: col.id, activo: true },
      orderBy: { id: "asc" },
      include: { paradas: { where: { activa: true }, orderBy: { orden: "asc" } } },
    });
    if (!buses.length) continue;

    let seq = 1;

    for (const bus of buses) {
      // tomanos todas las paradas “casas” (excluye depósito y colegio)
      const houseStops = bus.paradas.filter(p => p.nombre!.startsWith("Parada Casa"));

      // número objetivo de estudiantes para este bus
      const nStudentsTarget = randInt(ESTUDIANTES_POR_BUS[0], ESTUDIANTES_POR_BUS[1]);

      for (let j = 0; j < nStudentsTarget; j++) {
        const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
        const curso = pick(CURSOS);
        const codigo = `${makePrefix(col.nombre)}-${String(seq).padStart(3, "0")}`;

        // Asignamos domicilio alrededor de una parada-casa concreta (espaciado mayor)
        const anchor = houseStops.length
          ? houseStops[randInt(0, houseStops.length - 1)]
          : (bus.paradas[1] ?? bus.paradas[0]); // fallback

        // Genera una casa alrededor del anchor (con dispersión amplia)
        const dn = randInt(-RADIO_CASAS_M, RADIO_CASAS_M);
        const de = randInt(-RADIO_CASAS_M, RADIO_CASAS_M);
        const home = offsetMeters(anchor.lat, anchor.lon, dn, de);

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

        seq++;
      }
      console.log(`👧👦 ${col.nombre} / ${bus.codigo}: ${nStudentsTarget} estudiantes asignados`);
    }
  }
}

/* ======================== MAIN ======================== */

async function main() {
  await upsertColegios();
  await seedBusesConConductores(BUSES_POR_COLEGIO);
  await seedRutasParadasTelemetria();   // crea rutas lógicas y telemetría en depósito
  await seedEstudiantesYAsignacion();   // crea estudiantes con casas más separadas y asigna al bus
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
