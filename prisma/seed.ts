import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const colegios = [
    { nombre: "Colegio San Martín", direccion: "Av. Beni 4to anillo, Santa Cruz", lat: -17.7468, lon: -63.1830 },
    { nombre: "Colegio Santa Ana",  direccion: "Av. Banzer 3er anillo, Santa Cruz", lat: -17.7562, lon: -63.1704 },
    { nombre: "Colegio Marista La Paz", direccion: "C. 16 de Obrajes, La Paz", lat: -16.5419, lon: -68.0837 },
    { nombre: "Colegio Don Bosco Cochabamba", direccion: "Av. América, Cochabamba", lat: -17.3849, lon: -66.1636 },
    { nombre: "Colegio Cristo Rey", direccion: "Av. Grigotá, Santa Cruz", lat: -17.8082, lon: -63.1785 },
  ];

  for (const c of colegios) {
    await prisma.colegio.upsert({
      where: { nombre: c.nombre },
      update: { direccion: c.direccion, lat: c.lat, lon: c.lon, activo: true },
      create: { ...c, activo: true },
    });
  }
  console.log("Seed: colegios listos ✅");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
