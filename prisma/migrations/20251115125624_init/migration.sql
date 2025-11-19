-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('SUPERADMIN', 'ADMIN_COLEGIO', 'CONDUCTOR', 'PADRE');

-- CreateTable
CREATE TABLE "public"."Colegio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "rol" "public"."Rol" NOT NULL,
    "email" TEXT NOT NULL,
    "hashPassword" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "colegioId" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Estudiante" (
    "id" SERIAL NOT NULL,
    "colegioId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "ci" TEXT,
    "nombre" TEXT NOT NULL,
    "curso" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "homeLat" DOUBLE PRECISION,
    "homeLon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PadreEstudiante" (
    "padreId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PadreEstudiante_pkey" PRIMARY KEY ("padreId","estudianteId")
);

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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EstudianteBus" (
    "estudianteId" INTEGER NOT NULL,
    "busId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudianteBus_pkey" PRIMARY KEY ("estudianteId","busId")
);

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
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Colegio_nombre_key" ON "public"."Colegio"("nombre");

-- CreateIndex
CREATE INDEX "Colegio_activo_idx" ON "public"."Colegio"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_activo_idx" ON "public"."Usuario"("rol", "activo");

-- CreateIndex
CREATE INDEX "Estudiante_colegioId_activo_idx" ON "public"."Estudiante"("colegioId", "activo");

-- CreateIndex
CREATE INDEX "Estudiante_homeLat_homeLon_idx" ON "public"."Estudiante"("homeLat", "homeLon");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_colegioId_codigo_key" ON "public"."Estudiante"("colegioId", "codigo");

-- CreateIndex
CREATE INDEX "Bus_colegioId_activo_idx" ON "public"."Bus"("colegioId", "activo");

-- CreateIndex
CREATE INDEX "Bus_conductorId_idx" ON "public"."Bus"("conductorId");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_colegioId_codigo_key" ON "public"."Bus"("colegioId", "codigo");

-- CreateIndex
CREATE INDEX "EstudianteBus_busId_idx" ON "public"."EstudianteBus"("busId");

-- CreateIndex
CREATE INDEX "Parada_busId_orden_idx" ON "public"."Parada"("busId", "orden");

-- CreateIndex
CREATE INDEX "Parada_lat_lon_idx" ON "public"."Parada"("lat", "lon");

-- CreateIndex
CREATE UNIQUE INDEX "TelemetriaBus_busId_key" ON "public"."TelemetriaBus"("busId");

-- CreateIndex
CREATE INDEX "TelemetriaBus_updatedAt_idx" ON "public"."TelemetriaBus"("updatedAt");

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_colegioId_fkey" FOREIGN KEY ("colegioId") REFERENCES "public"."Colegio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Estudiante" ADD CONSTRAINT "Estudiante_colegioId_fkey" FOREIGN KEY ("colegioId") REFERENCES "public"."Colegio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PadreEstudiante" ADD CONSTRAINT "PadreEstudiante_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PadreEstudiante" ADD CONSTRAINT "PadreEstudiante_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "public"."Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bus" ADD CONSTRAINT "Bus_colegioId_fkey" FOREIGN KEY ("colegioId") REFERENCES "public"."Colegio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bus" ADD CONSTRAINT "Bus_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstudianteBus" ADD CONSTRAINT "EstudianteBus_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "public"."Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstudianteBus" ADD CONSTRAINT "EstudianteBus_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Parada" ADD CONSTRAINT "Parada_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemetriaBus" ADD CONSTRAINT "TelemetriaBus_busId_fkey" FOREIGN KEY ("busId") REFERENCES "public"."Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
