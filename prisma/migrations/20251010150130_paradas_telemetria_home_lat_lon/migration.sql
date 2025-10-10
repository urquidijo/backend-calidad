-- CreateEnum
CREATE TYPE "public"."BusStatus" AS ENUM ('NO_INICIADA', 'EN_RUTA', 'EN_COLEGIO');

-- AlterTable
ALTER TABLE "public"."Bus" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Estudiante" ADD COLUMN     "homeLat" DOUBLE PRECISION,
ADD COLUMN     "homeLon" DOUBLE PRECISION,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."Parada" (
    "id" SERIAL NOT NULL,
    "busId" INTEGER NOT NULL,
    "nombre" TEXT,
    "orden" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TelemetriaBus" (
    "busId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "status" "public"."BusStatus" NOT NULL DEFAULT 'NO_INICIADA',
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."TelemetriaBusLog" (
    "id" SERIAL NOT NULL,
    "busId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetriaBusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parada_busId_orden_idx" ON "public"."Parada"("busId", "orden");

-- CreateIndex
CREATE INDEX "Parada_lat_lon_idx" ON "public"."Parada"("lat", "lon");

-- CreateIndex
CREATE UNIQUE INDEX "TelemetriaBus_busId_key" ON "public"."TelemetriaBus"("busId");

-- CreateIndex
CREATE INDEX "TelemetriaBus_status_idx" ON "public"."TelemetriaBus"("status");

-- CreateIndex
CREATE INDEX "TelemetriaBus_updatedAt_idx" ON "public"."TelemetriaBus"("updatedAt");

-- CreateIndex
CREATE INDEX "TelemetriaBusLog_busId_createdAt_idx" ON "public"."TelemetriaBusLog"("busId", "createdAt");

-- CreateIndex
CREATE INDEX "TelemetriaBusLog_lat_lon_idx" ON "public"."TelemetriaBusLog"("lat", "lon");

-- CreateIndex
CREATE INDEX "Bus_conductorId_idx" ON "public"."Bus"("conductorId");

-- CreateIndex
CREATE INDEX "Estudiante_homeLat_homeLon_idx" ON "public"."Estudiante"("homeLat", "homeLon");

-- CreateIndex
CREATE INDEX "EstudianteBus_busId_idx" ON "public"."EstudianteBus"("busId");

-- AddForeignKey
ALTER TABLE "public"."Parada" ADD CONSTRAINT "Parada_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemetriaBus" ADD CONSTRAINT "TelemetriaBus_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemetriaBusLog" ADD CONSTRAINT "TelemetriaBusLog_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
