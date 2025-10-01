-- CreateEnum
CREATE TYPE "public"."BusStatus" AS ENUM ('EN_RUTA', 'EN_COLEGIO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "public"."RideStatus" AS ENUM ('NINGUNO', 'ESPERANDO', 'EN_BUS', 'BAJO_EN_COLEGIO');

-- AlterTable
ALTER TABLE "public"."Bus" ADD COLUMN     "lastLat" DOUBLE PRECISION,
ADD COLUMN     "lastLon" DOUBLE PRECISION,
ADD COLUMN     "status" "public"."BusStatus" NOT NULL DEFAULT 'EN_RUTA',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Estudiante" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."EstudianteBus" ADD COLUMN     "boardedAt" TIMESTAMP(3),
ADD COLUMN     "droppedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."RideStatus" NOT NULL DEFAULT 'NINGUNO';

-- CreateTable
CREATE TABLE "public"."BusLocation" (
    "id" SERIAL NOT NULL,
    "busId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "speedKph" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusLocation_busId_timestamp_idx" ON "public"."BusLocation"("busId", "timestamp");

-- CreateIndex
CREATE INDEX "Bus_status_idx" ON "public"."Bus"("status");

-- CreateIndex
CREATE INDEX "EstudianteBus_busId_status_idx" ON "public"."EstudianteBus"("busId", "status");

-- AddForeignKey
ALTER TABLE "public"."BusLocation" ADD CONSTRAINT "BusLocation_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
