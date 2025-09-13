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
CREATE UNIQUE INDEX "Estudiante_colegioId_codigo_key" ON "public"."Estudiante"("colegioId", "codigo");

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_colegioId_fkey" FOREIGN KEY ("colegioId") REFERENCES "public"."Colegio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Estudiante" ADD CONSTRAINT "Estudiante_colegioId_fkey" FOREIGN KEY ("colegioId") REFERENCES "public"."Colegio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PadreEstudiante" ADD CONSTRAINT "PadreEstudiante_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PadreEstudiante" ADD CONSTRAINT "PadreEstudiante_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "public"."Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
