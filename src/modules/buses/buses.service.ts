import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type LatLng = { lat: number; lon: number };
type Waypoint = { tipo: 'CASA'|'COLEGIO'; id?: number; nombre: string; lat: number; lon: number };

const prisma = new PrismaClient();

type SimParams = {
  minSpeed: number;  // m/s
  maxSpeed: number;  // m/s
  accel: number;     // m/s^2
  decel: number;     // m/s^2
  brakeDist: number; // m
  dwellCasa: number; // s
  dwellColegio: number; // s
  tickMs: number;    // ms
};

type SimState = {
  timer?: ReturnType<typeof setInterval>;
  waypoints: Waypoint[];
  polyline: LatLng[];       // puntos = waypoints en línea
  cum: number[];            // distancias acumuladas
  segLens: number[];        // long por segmento
  total: number;
  s: number;                // distancia recorrida sobre polyline
  v: number;                // velocidad actual m/s
  at?: number;              // epoch ms última actualización
  dwellUntil?: number|null; // epoch ms
  idxNode: number;          // índice de nodo actual (aprox)
  heading: number;
  reachedEnd: boolean;
  params: SimParams;
};

const sims = new Map<number, SimState>(); // busId -> state

@Injectable()
export class BusesService {
  /* ================== Data base ================== */
  async getEstudiantesDeBus(busId: number) {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        estudiantes: { include: { estudiante: true } },
      },
    });
    if (!bus) throw new NotFoundException('Bus no encontrado');

    return bus.estudiantes
      .map((eb) => eb.estudiante)
      .filter((e) => e.activo && e.homeLat != null && e.homeLon != null)
      .map((e) => ({
        id: e.id,
        nombre: e.nombre,
        homeLat: e.homeLat!,
        homeLon: e.homeLon!,
      }));
  }

  async getColegioFromBus(busId: number) {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: { colegio: true },
    });
    if (!bus) throw new NotFoundException('Bus no encontrado');
    const c = bus.colegio;
    if (!c?.lat || !c?.lon) throw new NotFoundException('Colegio sin coordenadas');
    return { lat: c.lat, lon: c.lon, nombre: c.nombre };
  }

  /* ================== Ruta por casas ================== */
  async getRutaPorCasas(busId: number, startFrom: 'colegio'|'primeraCasa' = 'primeraCasa') {
    const casas = await this.getEstudiantesDeBus(busId);
    if (casas.length === 0) return { waypoints: [] };

    const colegio = await this.getColegioFromBus(busId);

    // Si startFrom=colegio, arrancamos desde el colegio y hacemos NN; si no, NN “libre” y luego colegio al final.
    let ordered = nearestNeighborOrder(
      casas.map((h) => ({ id: h.id, nombre: h.nombre, lat: h.homeLat, lon: h.homeLon })),
      startFrom === 'colegio' ? { lat: colegio.lat, lon: colegio.lon } : null,
    );

    const waypoints: Waypoint[] = ordered.map((x) => ({
      tipo: 'CASA',
      id: x.id,
      nombre: x.nombre,
      lat: x.lat,
      lon: x.lon,
    }));

    // Colegio al final
    waypoints.push({ tipo: 'COLEGIO', nombre: colegio.nombre, lat: colegio.lat, lon: colegio.lon });

    return { waypoints };
  }

  /* ================== Simulación ================== */
  async startSimulation(busId: number, body: Partial<SimParams> & { recomputeOrder?: boolean }) {
    // 1) Waypoints
    const { waypoints } = await this.getRutaPorCasas(busId, 'primeraCasa');
    if (!waypoints.length) throw new NotFoundException('No hay waypoints (casas/colegio)');

    // 2) Parámetros
    const params: SimParams = {
      minSpeed: body.minSpeed ?? 6,
      maxSpeed: body.maxSpeed ?? 15,
      accel: body.accel ?? 1.6,
      decel: body.decel ?? 2.2,
      brakeDist: body.brakeDist ?? 70,
      dwellCasa: body.dwellCasa ?? 12,
      dwellColegio: body.dwellColegio ?? 35,
      tickMs: body.tickMs ?? 60,
    };

    // 3) Construcción de polyline (pasa por cada waypoint en línea recta)
    const polyline: LatLng[] = waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
    const { segLens, cum, total } = precomputePolyline(polyline);

    // 4) Si ya hay una sim, detenla
    await this.stopSimulation(busId);

    // 5) Estado inicial
    const state: SimState = {
      waypoints, polyline, segLens, cum, total,
      s: 0, v: 0, idxNode: 0, heading: 0, at: Date.now(),
      dwellUntil: Date.now() + params.dwellCasa * 1000, // breve espera inicial
      reachedEnd: false, params,
    };

    // 6) Timer
    state.timer = setInterval(async () => {
      tickSimulation(state);
      // Persistencia liviana a TelemetriaBus
      const pos = pointAtS(state, state.s) ?? polyline[0];
      await prisma.telemetriaBus.upsert({
        where: { busId },
        create: { busId, lat: pos.lat, lon: pos.lon, heading: state.heading },
        update: { lat: pos.lat, lon: pos.lon, heading: state.heading },
      });

      if (state.reachedEnd && state.timer) {
        clearInterval(state.timer);
        sims.delete(busId);
      }
    }, state.params.tickMs);

    sims.set(busId, state);

    return {
      ok: true,
      startedAt: state.at,
      waypointsCount: waypoints.length,
      params,
    };
  }

  async stopSimulation(busId: number) {
    const s = sims.get(busId);
    if (s?.timer) clearInterval(s.timer);
    sims.delete(busId);
    return { ok: true };
  }

  async getLocation(busId: number) {
    const s = sims.get(busId);

    if (s) {
      const pos = pointAtS(s, s.s) ?? s.polyline[0];
      return {
        lat: pos.lat,
        lon: pos.lon,
        heading: s.heading,
        at: s.at,
        reachedEnd: s.reachedEnd,
        simulated: true,
      };
    }

    // Si no hay sim activa, intenta TelemetriaBus como fallback
    const t = await prisma.telemetriaBus.findUnique({ where: { busId } });
    if (t) {
      return { lat: t.lat, lon: t.lon, heading: t.heading ?? 0, at: Date.now(), simulated: false };
    }

    throw new NotFoundException('Sin telemetría/simulación para este bus');
  }
}

/* ============== Helpers de geometría/simulación ============== */

function toRad(x: number) { return (x * Math.PI) / 180; }
function toDeg(x: number) { return (x * 180) / Math.PI; }
function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }

function haversine(a: LatLng, b: LatLng) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearing(a: LatLng, b: LatLng) {
  if (a.lat === b.lat && a.lon === b.lon) return 0;
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1)*Math.sin(la2) - Math.sin(la1)*Math.cos(la2)*Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

function precomputePolyline(coords: LatLng[]) {
  const segLens: number[] = [];
  const cum: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversine(coords[i], coords[i+1]);
    segLens.push(d);
    cum.push(cum[cum.length - 1] + d);
  }
  return { segLens, cum, total: cum[cum.length - 1] ?? 0 };
}

function findSegmentIndex(cum: number[], s: number) {
  if (cum.length <= 1) return 0;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (s < cum[mid]) hi = mid;
    else lo = mid;
  }
  return Math.max(0, Math.min(lo, cum.length - 2));
}

function pointAtS(state: { polyline: LatLng[], cum: number[], segLens: number[], total: number }, s: number): LatLng | null {
  const { polyline: coords, cum, segLens, total } = state;
  if (coords.length < 2) return coords[0] ?? null;
  s = clamp(s, 0, total);
  const idx = findSegmentIndex(cum, s);
  const segLen = segLens[idx] || 0;
  const A = coords[idx], B = coords[idx + 1];
  if (segLen <= 0) return A;
  const t = clamp((s - cum[idx]) / segLen, 0, 1);
  return {
    lat: A.lat + (B.lat - A.lat) * t,
    lon: A.lon + (B.lon - A.lon) * t,
  };
}

function nearestNeighborOrder(
  items: Array<{ id: number; nombre: string; lat: number; lon: number }>,
  start: { lat: number; lon: number } | null,
) {
  const remaining = items.slice();
  const result: typeof items = [];

  let current: { lat: number; lon: number };
  if (start) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(start, { lat: remaining[i].lat, lon: remaining[i].lon });
      if (d < best) { best = d; idx = i; }
    }
    const first = remaining.splice(idx, 1)[0];
    result.push(first);
    current = { lat: first.lat, lon: first.lon };
  } else {
    const first = remaining.shift();
    if (!first) return result;
    result.push(first);
    current = { lat: first.lat, lon: first.lon };
  }

  while (remaining.length) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, { lat: remaining[i].lat, lon: remaining[i].lon });
      if (d < best) { best = d; idx = i; }
    }
    const next = remaining.splice(idx, 1)[0];
    result.push(next);
    current = { lat: next.lat, lon: next.lon };
  }

  return result;
}

function normalizeAngleDelta(fromDeg: number, toDeg: number) {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}
function normalizeHeading(h: number) {
  return (h % 360 + 360) % 360;
}

function tickSimulation(s: SimState) {
  const now = Date.now();
  const dt = s.at ? (now - s.at) / 1000 : 0.05;
  s.at = now;

  if (s.reachedEnd) return;

  // Dwell?
  if (s.dwellUntil && now < s.dwellUntil) return;
  if (s.dwellUntil && now >= s.dwellUntil) s.dwellUntil = null;

  // Distancia a fin de segmento
  const idx = findSegmentIndex(s.cum, s.s);
  const distToSegEnd = s.cum[idx + 1] - s.s;

  // Objetivo de velocidad
  const target = distToSegEnd < s.params.brakeDist
    ? Math.max(s.params.minSpeed * 0.3, (distToSegEnd / s.params.brakeDist) * (s.params.maxSpeed))
    : s.params.maxSpeed;

  const accel = (target >= s.v) ? s.params.accel : -s.params.decel;
  s.v = clamp(s.v + accel * dt, 0, s.params.maxSpeed);

  // Integración
  s.s += s.v * dt;
  if (s.s >= s.total) {
    s.s = s.total;
    s.v = 0;
    s.reachedEnd = true;
  }

  // Heading
  const pos = pointAtS(s, s.s) ?? s.polyline[s.polyline.length - 1];
  const look = pointAtS(s, clamp(s.s + 10, 0, s.total)) ?? pos;
  const hNext = bearing(pos, look);
  const delta = normalizeAngleDelta(s.heading, hNext);
  s.heading = normalizeHeading(s.heading + delta * 0.2);

  // Dwell en nodos (cuando estamos muy cerca)
  const nodeIdx = nearestNodeIndex(s.cum, s.s);
  const sNode = s.cum[nodeIdx];
  if (Math.abs(s.s - sNode) < 2.0) {
    const isLast = nodeIdx === s.cum.length - 1;
    const isSchool = isLast || s.waypoints[nodeIdx]?.tipo === 'COLEGIO';
    const dwellBase = isSchool ? s.params.dwellColegio : s.params.dwellCasa;
    s.dwellUntil = now + dwellBase * 1000;
    s.v = 0;
  }
}

function nearestNodeIndex(cum: number[], s: number) {
  let bestI = 0, best = Infinity;
  for (let i = 0; i < cum.length; i++) {
    const d = Math.abs(cum[i] - s);
    if (d < best) { best = d; bestI = i; }
  }
  return bestI;
}
