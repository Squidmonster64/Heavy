-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('REHAB', 'STRENGTH', 'RUN', 'CYCLE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'MANUAL_MATCHED', 'AMBIGUOUS');

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "taperStart" DATE,
    "raceDate" DATE,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDay" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "modality" "Modality" NOT NULL,
    "templateId" TEXT,

    CONSTRAINT "ProgramDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTemplate" (
    "id" TEXT NOT NULL,
    "modality" "Modality" NOT NULL,
    "name" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledSession" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "modality" "Modality" NOT NULL,
    "templateId" TEXT,
    "templateName" TEXT,
    "plannedStructure" JSONB NOT NULL,
    "originalStructure" JSONB,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "intervalsExternalId" TEXT NOT NULL,
    "intervalsEventId" TEXT,
    "intervalsActivityId" TEXT,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchConfidence" DOUBLE PRECISION,
    "notes" TEXT,
    "exportLog" JSONB,
    "completion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityMatchCandidate" (
    "id" TEXT NOT NULL,
    "scheduledSessionId" TEXT NOT NULL,
    "intervalsActivityId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityMatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulledActivity" (
    "id" TEXT NOT NULL,
    "intervalsActivityId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "durationSec" DOUBLE PRECISION,
    "distanceM" DOUBLE PRECISION,
    "startTime" TIMESTAMP(3),
    "load" DOUBLE PRECISION,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulledActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseLibrary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "equipment" TEXT,
    "kneeFlag" TEXT,
    "shoulderFlag" TEXT,
    "spineFlag" TEXT,
    "cues" TEXT,

    CONSTRAINT "ExerciseLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellnessSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'intervals.icu',
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledSession_intervalsExternalId_key" ON "ScheduledSession"("intervalsExternalId");

-- CreateIndex
CREATE INDEX "ScheduledSession_date_idx" ON "ScheduledSession"("date");

-- CreateIndex
CREATE INDEX "ScheduledSession_status_idx" ON "ScheduledSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledSession_programId_date_modality_templateId_key" ON "ScheduledSession"("programId", "date", "modality", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityMatchCandidate_scheduledSessionId_intervalsActivity_key" ON "ActivityMatchCandidate"("scheduledSessionId", "intervalsActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "PulledActivity_intervalsActivityId_key" ON "PulledActivity"("intervalsActivityId");

-- CreateIndex
CREATE INDEX "PulledActivity_date_idx" ON "PulledActivity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WellnessSnapshot_date_key" ON "WellnessSnapshot"("date");

-- AddForeignKey
ALTER TABLE "ProgramDay" ADD CONSTRAINT "ProgramDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDay" ADD CONSTRAINT "ProgramDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SessionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledSession" ADD CONSTRAINT "ScheduledSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMatchCandidate" ADD CONSTRAINT "ActivityMatchCandidate_scheduledSessionId_fkey" FOREIGN KEY ("scheduledSessionId") REFERENCES "ScheduledSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

