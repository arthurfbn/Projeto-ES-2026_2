-- CreateTable
CREATE TABLE "allowed_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "membership_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_minute" SMALLINT NOT NULL,
    "end_minute" SMALLINT NOT NULL,

    CONSTRAINT "allowed_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "allowed_shifts_membership_id_idx" ON "allowed_shifts"("membership_id");

-- AddForeignKey
ALTER TABLE "allowed_shifts" ADD CONSTRAINT "allowed_shifts_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "barber_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Garantias de domínio no banco (manual; skill banco-migrations)
ALTER TABLE "allowed_shifts" ADD CONSTRAINT "allowed_shifts_weekday" CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "allowed_shifts" ADD CONSTRAINT "allowed_shifts_minutes" CHECK (
  "start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute"
  AND "start_minute" % 15 = 0 AND "end_minute" % 15 = 0
);
-- Janelas do mesmo vínculo não se sobrepõem no mesmo dia.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "allowed_shifts" ADD CONSTRAINT "allowed_shifts_no_overlap" EXCLUDE USING gist (
  "membership_id" WITH =,
  "weekday" WITH =,
  int4range("start_minute", "end_minute", '[)') WITH &&
);
