/*
  Warnings:

  - You are about to drop the column `status` on the `TelemetriaBus` table. All the data in the column will be lost.
  - You are about to drop the `TelemetriaBusLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TelemetriaBusLog" DROP CONSTRAINT "TelemetriaBusLog_busId_fkey";

-- DropIndex
DROP INDEX "public"."TelemetriaBus_status_idx";

-- AlterTable
ALTER TABLE "public"."TelemetriaBus" DROP COLUMN "status";

-- DropTable
DROP TABLE "public"."TelemetriaBusLog";

-- DropEnum
DROP TYPE "public"."BusStatus";
