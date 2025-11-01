import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';



type LatLng = { lat: number; lon: number };

type Waypoint = {
  tipo: 'DEPOSITO' | 'CASA' | 'COLEGIO';
  id?: number;
  nombre: string;
  lat: number;
  lon: number;
};
type RouteNode = {
  id?: number;
  nombre: string;
  lat: number;
  lon: number;
};


const prisma = new PrismaClient();
let fetchImpl: typeof fetch | null = typeof fetch === 'function' ? fetch : null;

async function getFetch() {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch === 'function') {
    fetchImpl = fetch;
    return fetchImpl;
  }
  try {
    const mod = await import('node-fetch');
    fetchImpl = (mod.default || mod) as unknown as typeof fetch;
  } catch {
    fetchImpl = null;
  }
  if (!fetchImpl) {
    throw new Error('fetch no disponible');
  }
  return fetchImpl;
}


type SimParams = {

  minSpeed: number; // m/s

  maxSpeed: number; // m/s

  accel: number; // m/s^2

  decel: number; // m/s^2

  brakeDist: number; // m

  dwellCasa: number; // s

  dwellColegio: number; // s

  tickMs: number; // ms

};



type SimState = {

  timer?: ReturnType<typeof setInterval>;

  waypoints: Waypoint[];

  polyline: LatLng[]; // puntos = waypoints en línea

  cum: number[]; // distancias acumuladas

  segLens: number[]; // long por segmento

  total: number;

  s: number; // distancia recorrida sobre polyline

  v: number; // velocidad actual m/s

  at?: number; // epoch ms última actualización

  dwellUntil?: number | null; // epoch ms

  idxNode: number; // índice de nodo actual (aprox)

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

    if (!c?.lat || !c?.lon)

      throw new NotFoundException('Colegio sin coordenadas');

    return { lat: c.lat, lon: c.lon, nombre: c.nombre };

  }



  /* ================== Ruta por casas ================== */

  async getRutaPorCasas(

    busId: number,

    startFrom: 'colegio' | 'primeraCasa' = 'primeraCasa',

  ) {

    const casas = await this.getEstudiantesDeBus(busId);

    const colegio = await this.getColegioFromBus(busId);



    const startWaypoint =

      startFrom === 'colegio'

        ? {

            tipo: 'COLEGIO' as const,

            nombre: colegio.nombre,

            lat: colegio.lat,

            lon: colegio.lon,

          }

        : await this.getInicioDeRuta(busId);



    const houseNodes = casas.map((h) => ({
      id: h.id,
      nombre: h.nombre,
      lat: h.homeLat,
      lon: h.homeLon,
    }));

    const start = startWaypoint
      ? { lat: startWaypoint.lat, lon: startWaypoint.lon }
      : null;
    const finish = { lat: colegio.lat, lon: colegio.lon };
    const ordered = optimizeRouteOrder(houseNodes, start, finish);

    const waypoints: Waypoint[] = [];
    if (startWaypoint) waypoints.push(startWaypoint);
    ordered.forEach((node) =>
      waypoints.push({
        tipo: 'CASA',
        id: node.id,
        nombre: node.nombre,
        lat: node.lat,
        lon: node.lon,
      }),
    );

    if (
      !waypoints.length ||
      !coordsAlmostEqual(waypoints[waypoints.length - 1], finish)
    ) {
      waypoints.push({
        tipo: 'COLEGIO',
        nombre: colegio.nombre,
        lat: colegio.lat,
        lon: colegio.lon,
      });
    }

    const straightDistance = routeDistance(ordered, start, finish);
    const { polyline, distanceMeters: streetDistance } = await buildStreetPolyline(waypoints);

    return {
      waypoints,
      distanceMeters: streetDistance ?? straightDistance,
      polyline,
    };
  }




  private async getInicioDeRuta(busId: number) {

    const parada = await prisma.parada.findFirst({

      where: { busId, activa: true },

      orderBy: { orden: 'asc' },

    });

    if (parada) {

      return {

        tipo: 'DEPOSITO' as const,

        nombre: parada.nombre ?? 'Inicio de ruta',

        lat: parada.lat,

        lon: parada.lon,

      };

    }



    const tele = await prisma.telemetriaBus.findUnique({ where: { busId } });

    if (tele) {

      return {

        tipo: 'DEPOSITO' as const,

        nombre: 'Posicion actual',

        lat: tele.lat,

        lon: tele.lon,

      };

    }



    return null;

  }





  /* ================== Simulación ================== */

  async startSimulation(
    busId: number,
    body: Partial<SimParams> & { recomputeOrder?: boolean },
  ) {
    const { waypoints, distanceMeters, polyline: streetPolyline } =
      await this.getRutaPorCasas(busId, 'primeraCasa');
    if (!waypoints.length) {
      throw new NotFoundException('No hay waypoints (casas/colegio)');
    }

    const polyline: LatLng[] =
      streetPolyline && streetPolyline.length >= 2
        ? streetPolyline
        : waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
    if (polyline.length < 2) {
      throw new NotFoundException(
        'Ruta insuficiente para simular (se requieren al menos dos puntos)',
      );
    }

    const params: SimParams = {
      minSpeed: body.minSpeed ?? 12,
      maxSpeed: body.maxSpeed ?? 30,
      accel: body.accel ?? 1.6,
      decel: body.decel ?? 2.2,
      brakeDist: body.brakeDist ?? 70,
      dwellCasa: body.dwellCasa ?? 2,
      dwellColegio: body.dwellColegio ?? 35,
      tickMs: body.tickMs ?? 60,
    };

    const { segLens, cum, total } = precomputePolyline(polyline);

    await this.stopSimulation(busId);

    const state: SimState = {
      waypoints,
      polyline,
      segLens,
      cum,
      total,
      s: 0,
      v: 0,
      idxNode: 0,
      heading: 0,
      at: Date.now(),
      dwellUntil: Date.now() + params.dwellCasa * 1000,
      reachedEnd: false,
      params,
    };

    state.timer = setInterval(async () => {
      tickSimulation(state);

      const pos = pointAtS(state, state.s) ?? state.polyline[0];
      await prisma.telemetriaBus.upsert({
        where: { busId },
        create: { busId, lat: pos.lat, lon: pos.lon, heading: state.heading },
        update: { lat: pos.lat, lon: pos.lon, heading: state.heading },
      });

      if (state.reachedEnd && state.timer) {
        clearInterval(state.timer);
        state.timer = undefined;
        sims.delete(busId);
      }
    }, state.params.tickMs);

    sims.set(busId, state);

    return {
      ok: true,
      startedAt: state.at,
      waypointsCount: waypoints.length,
      distanceMeters,
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

      return {

        lat: t.lat,

        lon: t.lon,

        heading: t.heading ?? 0,

        at: Date.now(),

        simulated: false,

      };

    }



    throw new NotFoundException('Sin telemetría/simulación para este bus');

  }

}



/* ============== Helpers de geometría/simulación ============== */



function toRad(x: number) {

  return (x * Math.PI) / 180;

}

function toDeg(x: number) {

  return (x * 180) / Math.PI;

}

function clamp(x: number, a: number, b: number) {

  return Math.max(a, Math.min(b, x));

}



function haversine(a: LatLng, b: LatLng) {

  const R = 6371000;

  const dLat = toRad(b.lat - a.lat);

  const dLon = toRad(b.lon - a.lon);

  const la1 = toRad(a.lat),

    la2 = toRad(b.lat);

  const h =

    Math.sin(dLat / 2) ** 2 +

    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));

}



function bearing(a: LatLng, b: LatLng) {

  if (a.lat === b.lat && a.lon === b.lon) return 0;

  const la1 = toRad(a.lat);

  const la2 = toRad(b.lat);

  const dLon = toRad(b.lon - a.lon);

  const y = Math.sin(dLon) * Math.cos(la2);

  const x =

    Math.cos(la1) * Math.sin(la2) -

    Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);

  const brng = Math.atan2(y, x);

  return (toDeg(brng) + 360) % 360;

}



function precomputePolyline(coords: LatLng[]) {

  const segLens: number[] = [];

  const cum: number[] = [0];

  for (let i = 0; i < coords.length - 1; i++) {

    const d = haversine(coords[i], coords[i + 1]);

    segLens.push(d);

    cum.push(cum[cum.length - 1] + d);

  }

  return { segLens, cum, total: cum[cum.length - 1] ?? 0 };

}



function findSegmentIndex(cum: number[], s: number) {

  if (cum.length <= 1) return 0;

  let lo = 0,

    hi = cum.length - 1;

  while (lo < hi - 1) {

    const mid = (lo + hi) >> 1;

    if (s < cum[mid]) hi = mid;

    else lo = mid;

  }

  return Math.max(0, Math.min(lo, cum.length - 2));

}



function pointAtS(

  state: {

    polyline: LatLng[];

    cum: number[];

    segLens: number[];

    total: number;

  },

  s: number,

): LatLng | null {

  const { polyline: coords, cum, segLens, total } = state;

  if (coords.length < 2) return coords[0] ?? null;

  s = clamp(s, 0, total);

  const idx = findSegmentIndex(cum, s);

  const segLen = segLens[idx] || 0;

  const A = coords[idx],

    B = coords[idx + 1];

  if (segLen <= 0) return A;

  const t = clamp((s - cum[idx]) / segLen, 0, 1);

  return {

    lat: A.lat + (B.lat - A.lat) * t,

    lon: A.lon + (B.lon - A.lon) * t,

  };

}



function optimizeRouteOrder(
  items: RouteNode[],
  start: LatLng | null,
  finish: LatLng,
) {
  if (items.length <= 1) return items.slice();

  const exact = solveTspExact(items, start, finish);
  if (exact) return exact;

  const initial = nearestNeighborOrder(items, start);
  return twoOptOptimize(initial, start, finish);
}

function solveTspExact(
  items: RouteNode[],
  start: LatLng | null,
  finish: LatLng | null,
) {
  const n = items.length;
  if (n === 0) return [];

  // Bitmask DP explota para n grandes, limitamos a 12 (4096 estados)
  const HARD_LIMIT = 12;
  if (n > HARD_LIMIT) return null;

  const dist: number[][] = Array.from({ length: n }, () =>
    Array<number>(n).fill(0),
  );
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      dist[i][j] = haversine(items[i], items[j]);
    }
  }

  const startDist = items.map((node) =>
    start ? haversine(start, node) : 0,
  );
  const endDist = items.map((node) =>
    finish ? haversine(node, finish) : 0,
  );

  const size = 1 << n;
  const INF = Number.POSITIVE_INFINITY;
  const dp: number[][] = Array.from({ length: size }, () =>
    Array<number>(n).fill(INF),
  );
  const parent: number[][] = Array.from({ length: size }, () =>
    Array<number>(n).fill(-1),
  );

  for (let i = 0; i < n; i++) {
    dp[1 << i][i] = start ? startDist[i] : 0;
  }

  for (let mask = 1; mask < size; mask++) {
    for (let last = 0; last < n; last++) {
      const cost = dp[mask][last];
      if (!isFinite(cost)) continue;
      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue;
        const newMask = mask | (1 << next);
        const nextCost = cost + dist[last][next];
        if (nextCost < dp[newMask][next]) {
          dp[newMask][next] = nextCost;
          parent[newMask][next] = last;
        }
      }
    }
  }

  let bestCost = INF;
  let bestLast = -1;
  const fullMask = size - 1;
  for (let last = 0; last < n; last++) {
    const cost = dp[fullMask][last] + (finish ? endDist[last] : 0);
    if (cost < bestCost) {
      bestCost = cost;
      bestLast = last;
    }
  }

  if (bestLast === -1) return null;

  const order: RouteNode[] = [];
  let mask = fullMask;
  let current = bestLast;
  while (current !== -1) {
    order.push(items[current]);
    const prev = parent[mask][current];
    mask &= ~(1 << current);
    current = prev;
  }
  order.reverse();
  return order;
}

function twoOptOptimize(
  route: RouteNode[],
  start: LatLng | null,
  finish: LatLng | null,

) {

  if (route.length < 3) return route.slice();



  let best = route.slice();

  let bestDist = routeDistance(best, start, finish);

  let improved = true;

  let iterations = 0;

  const maxIterations = Math.min(25, route.length * route.length);



  while (improved && iterations < maxIterations) {

    improved = false;

    iterations += 1;

    for (let i = 0; i < best.length - 1; i++) {

      for (let j = i + 1; j < best.length; j++) {

        const candidate = twoOptSwap(best, i, j);

        const dist = routeDistance(candidate, start, finish);

        if (dist + 1e-3 < bestDist) {

          best = candidate;

          bestDist = dist;

          improved = true;

        }

      }

    }

  }



  return best;

}



function twoOptSwap(route: RouteNode[], i: number, k: number) {

  return [

    ...route.slice(0, i),

    ...route.slice(i, k + 1).reverse(),

    ...route.slice(k + 1),

  ];

}



function routeDistance(
  order: RouteNode[],
  start: LatLng | null,
  finish: LatLng | null,
) {
  if (!order.length) {

    if (start && finish) return haversine(start, finish);

    return 0;

  }



  let total = 0;

  let prev: LatLng | null = start;

  for (const node of order) {

    if (prev) total += haversine(prev, node);

    prev = { lat: node.lat, lon: node.lon };

  }

  if (finish && prev) {
    total += haversine(prev, finish);
  }
  return total;
}

async function buildStreetPolyline(waypoints: Waypoint[]) {
  const base = waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
  if (base.length < 2) {
    return { polyline: base, distanceMeters: 0 };
  }

  let fetcher: typeof fetch | null = null;
  try {
    fetcher = await getFetch();
  } catch {
    fetcher = null;
  }

  if (fetcher) {
    try {
      const { coordinates, distance } = await fetchStreetRoute(fetcher, base);
      const deduped = dedupePolyline(coordinates);
      if (deduped.length >= 2) {
        return {
          polyline: deduped,
          distanceMeters: distance ?? polylineDistanceMeters(deduped),
        };
      }
    } catch {
      // fallback a estrategia incremental si la ruta completa falla
    }
  }

  const polyline: LatLng[] = [];
  let total = 0;

  const pushPoint = (pt: LatLng) => {
    const last = polyline[polyline.length - 1];
    if (!last || !coordsAlmostEqual(last, pt, 1e-8)) {
      polyline.push(pt);
    }
  };

  for (let i = 0; i < base.length - 1; i++) {
    const from = base[i];
    const to = base[i + 1];

    let segment: LatLng[];
    if (fetcher) {
      try {
        segment = await fetchStreetSegment(fetcher, from, to);
      } catch {
        segment = [from, to];
      }
    } else {
      segment = [from, to];
    }

    if (!segment.length) segment = [from, to];
    segment.forEach((pt) => pushPoint(pt));
    for (let j = 1; j < segment.length; j++) {
      total += haversine(segment[j - 1], segment[j]);
    }
  }

  if (!polyline.length) {
    base.forEach((pt) => polyline.push(pt));
    total = polylineDistanceMeters(base);
  } else if (!total) {
    total = polylineDistanceMeters(polyline);
  }

  return { polyline, distanceMeters: total };
}

const snapCache = new Map<string, LatLng>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const shouldRetryStatus = (status: number) =>
  status === 429 || (status >= 500 && status < 600);

const snapKey = (pt: LatLng) => `${pt.lat.toFixed(6)},${pt.lon.toFixed(6)}`;

async function snapToStreet(fetcher: typeof fetch, point: LatLng): Promise<LatLng | null> {
  const key = snapKey(point);
  const cached = snapCache.get(key);
  if (cached) return cached;

  const url = `https://router.project-osrm.org/nearest/v1/driving/${point.lon},${point.lat}?number=1`;
  try {
    const res = await fetcher(url);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const loc: [number, number] | undefined = data?.waypoints?.[0]?.location;
    if (Array.isArray(loc) && loc.length === 2) {
      const snapped = { lat: loc[1], lon: loc[0] };
      snapCache.set(key, snapped);
      return snapped;
    }
  } catch {
    // omit network errors, fall back to original coordinate
  }
  return null;
}

async function fetchStreetSegment(
  fetcher: typeof fetch,
  from: LatLng,
  to: LatLng,
) {
  const baseParams =
    'overview=full&geometries=geojson&steps=false&annotations=distance&continue_straight=false';
  const radiusVariants: (number | null)[] = [120, 240, 480, 720, null];

  const [snapFrom, snapTo] = await Promise.all([
    snapToStreet(fetcher, from).catch(() => null),
    snapToStreet(fetcher, to).catch(() => null),
  ]);

  const combos: { start: LatLng; end: LatLng }[] = [];
  const pushCombo = (start: LatLng | null, end: LatLng | null) => {
    if (!start || !end) return;
    combos.push({ start, end });
  };

  pushCombo(snapFrom, snapTo);
  pushCombo(snapFrom ?? from, to);
  pushCombo(from, snapTo ?? to);
  combos.push({ start: from, end: to });

  const seenCombos = new Set<string>();
  const comboKey = (start: LatLng, end: LatLng) =>
    `${start.lat},${start.lon}|${end.lat},${end.lon}`;

  for (const { start, end } of combos) {
    const key = comboKey(start, end);
    if (seenCombos.has(key)) continue;
    seenCombos.add(key);

    const coordPair = `${start.lon},${start.lat};${end.lon},${end.lat}`;

    for (const radius of radiusVariants) {
      const radiusParam =
        radius != null ? `&radiuses=${radius};${radius}` : '';
      const url = `https://router.project-osrm.org/route/v1/driving/${coordPair}?${baseParams}${radiusParam}`;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetcher(url);
          if (!res.ok) {
            if (shouldRetryStatus(res.status) && attempt < 2) {
              await sleep(150 * (attempt + 1));
              continue;
            }
            break;
          }

          const data = (await res.json()) as any;
          const coords: [number, number][] =
            data?.routes?.[0]?.geometry?.coordinates ?? [];
          if (coords.length >= 2) {
            return coords.map(([lon, lat]) => ({ lat, lon }));
          }
          break;
        } catch {
          if (attempt < 2) {
            await sleep(150 * (attempt + 1));
            continue;
          }
          break;
        }
      }
    }
  }

  throw new Error('OSRM response sin geometria');
}

async function fetchStreetRoute(
  fetcher: typeof fetch,
  points: LatLng[],
) {
  const baseParams =
    'overview=full&geometries=geojson&steps=false&annotations=distance&continue_straight=false';
  const radiusVariants: (number | null)[] = [120, 240, 480, 720, null];

  const snappedPoints = await Promise.all(
    points.map((pt) => snapToStreet(fetcher, pt).catch(() => null)),
  );

  const pointCandidates: LatLng[][] = [];
  pointCandidates.push(points);
  if (snappedPoints.some((pt) => pt)) {
    pointCandidates.push(
      points.map((pt, idx) => snappedPoints[idx] ?? pt),
    );
  }

  const seen = new Set<string>();

  for (const candidate of pointCandidates) {
    const coords = candidate.map((pt) => `${pt.lon},${pt.lat}`).join(';');
    if (seen.has(coords)) continue;
    seen.add(coords);

    for (const radius of radiusVariants) {
      const radiusParam =
        radius != null
          ? `&radiuses=${candidate.map(() => radius).join(';')}`
          : '';
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?${baseParams}${radiusParam}`;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetcher(url);
          if (!res.ok) {
            if (shouldRetryStatus(res.status) && attempt < 2) {
              await sleep(150 * (attempt + 1));
              continue;
            }
            break;
          }
          const data = (await res.json()) as any;
          if (data?.code && data.code !== 'Ok') break;
          const route = data?.routes?.[0];
          const coordsArr: [number, number][] =
            route?.geometry?.coordinates ?? [];
          if (coordsArr.length >= 2) {
            const polyline = coordsArr.map(([lon, lat]) => ({ lat, lon }));
            const distance =
              typeof route?.distance === 'number' ? route.distance : null;
            return { coordinates: polyline, distance };
          }
          break;
        } catch {
          if (attempt < 2) {
            await sleep(150 * (attempt + 1));
            continue;
          }
          break;
        }
      }
    }
  }

  throw new Error('OSRM multi-leg sin geometria');
}

function coordsAlmostEqual(a: LatLng, b: LatLng, epsilon = 1e-5) {
  return Math.abs(a.lat - b.lat) <= epsilon && Math.abs(a.lon - b.lon) <= epsilon;
}

function dedupePolyline(points: LatLng[], epsilon = 1e-8) {
  const deduped: LatLng[] = [];
  for (const pt of points) {
    const last = deduped[deduped.length - 1];
    if (!last || !coordsAlmostEqual(last, pt, epsilon)) {
      deduped.push(pt);
    }
  }
  return deduped;
}

function polylineDistanceMeters(points: LatLng[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1], points[i]);
  }
  return total;
}

function nearestNeighborOrder(

  items: RouteNode[],

  start: { lat: number; lon: number } | null,

) {

  const remaining = items.slice();

  const result: typeof items = [];



  let current: { lat: number; lon: number };

  if (start) {

    let idx = 0,

      best = Infinity;

    for (let i = 0; i < remaining.length; i++) {

      const d = haversine(start, {

        lat: remaining[i].lat,

        lon: remaining[i].lon,

      });

      if (d < best) {

        best = d;

        idx = i;

      }

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

    let idx = 0,

      best = Infinity;

    for (let i = 0; i < remaining.length; i++) {

      const d = haversine(current, {

        lat: remaining[i].lat,

        lon: remaining[i].lon,

      });

      if (d < best) {

        best = d;

        idx = i;

      }

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

  return ((h % 360) + 360) % 360;

}



function tickSimulation(s: SimState) {

  const now = Date.now();

  const dt = s.at ? (now - s.at) / 1000 : 0.05;

  s.at = now;



  if (s.reachedEnd) return;



  // Dwell activo

  if (s.dwellUntil && now < s.dwellUntil) return;

  if (s.dwellUntil && now >= s.dwellUntil) s.dwellUntil = null;



  // Índice y distancia a fin de segmento

  const idx = findSegmentIndex(s.cum, s.s);

  const distToSegEnd = s.cum[idx + 1] - s.s;



  // Velocidad objetivo con frenado suave

  const target =

    distToSegEnd < s.params.brakeDist

      ? Math.max(

          s.params.minSpeed * 0.3,

          (distToSegEnd / s.params.brakeDist) * s.params.maxSpeed,

        )

      : s.params.maxSpeed;



  const accel = target >= s.v ? s.params.accel : -s.params.decel;

  s.v = clamp(s.v + accel * dt, 0, s.params.maxSpeed);



  // Integración

  s.s += s.v * dt;



  // --- SNAP A ÚLTIMO NODO (COLEGIO) ---

  const lastIdx = s.cum.length - 1;

  const sLast = s.cum[lastIdx];

  const SNAP_M = 3.0; // si estamos a <3m del último nodo, pegamos

  if (Math.abs(s.s - sLast) <= SNAP_M) {

    s.s = sLast;

  }



  // ¿llegó al final?

  if (s.s >= s.total) {

    s.s = s.total;

    s.v = 0;

    // dwell corto final opcional y FIN

    s.dwellUntil = now + s.params.dwellColegio * 1000;

    s.reachedEnd = true;

    return;

  }



  // Heading

  const pos = pointAtS(s, s.s) ?? s.polyline[s.polyline.length - 1];

  const look = pointAtS(s, clamp(s.s + 10, 0, s.total)) ?? pos;

  const hNext = bearing(pos, look);

  const delta = normalizeAngleDelta(s.heading, hNext);

  s.heading = normalizeHeading(s.heading + delta * 0.2);



  // Dwell en nodos intermedios

  const nodeIdx = nearestNodeIndex(s.cum, s.s);

  const sNode = s.cum[nodeIdx];

  // Umbral más generoso para “tocar” el nodo

  if (Math.abs(s.s - sNode) < 2.5) {

    const isLast = nodeIdx === lastIdx;

    const dwellBase = isLast ? s.params.dwellColegio : s.params.dwellCasa;

    if (!s.dwellUntil) {

      s.dwellUntil = now + dwellBase * 1000;

      s.v = 0;

    }

  }

}



function nearestNodeIndex(cum: number[], s: number) {

  let bestI = 0,

    best = Infinity;

  for (let i = 0; i < cum.length; i++) {

    const d = Math.abs(cum[i] - s);

    if (d < best) {

      best = d;

      bestI = i;

    }

  }

  return bestI;

}


