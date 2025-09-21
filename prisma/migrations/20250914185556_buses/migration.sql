-- AlterTable
ALTER TABLE "public"."Estudiante" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."Bus" (
    "id" SERIAL NOT NULL,
    "colegioId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT,
    "placa" TEXT,
    "conductorId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EstudianteBus" (
    "estudianteId" INTEGER NOT NULL,
    "busId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudianteBus_pkey" PRIMARY KEY ("estudianteId","busId")
);

-- CreateIndex
CREATE INDEX "Bus_colegioId_activo_idx" ON "public"."Bus"("colegioId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_colegioId_codigo_key" ON "public"."Bus"("colegioId", "codigo");

-- AddForeignKey
ALTER TABLE "public"."Bus" ADD CONSTRAINT "Bus_colegioId_fkey" FOREIGN KEY ("colegioId") REFERENCES "public"."Colegio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bus" ADD CONSTRAINT "Bus_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstudianteBus" ADD CONSTRAINT "EstudianteBus_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "public"."Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstudianteBus" ADD CONSTRAINT "EstudianteBus_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
