-- CreateTable
CREATE TABLE "barber_availabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_minute" SMALLINT NOT NULL,
    "end_minute" SMALLINT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_availabilities_membership_id_idx" ON "barber_availabilities"("membership_id");

-- CreateIndex
CREATE INDEX "barber_availabilities_user_id_weekday_idx" ON "barber_availabilities"("user_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "barber_memberships_id_barbershop_id_user_id_key" ON "barber_memberships"("id", "barbershop_id", "user_id");

-- AddForeignKey
ALTER TABLE "barber_availabilities" ADD CONSTRAINT "barber_availabilities_membership_id_barbershop_id_user_id_fkey" FOREIGN KEY ("membership_id", "barbershop_id", "user_id") REFERENCES "barber_memberships"("id", "barbershop_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Garantias de domínio no banco (manual; skill banco-migrations)
ALTER TABLE "barber_availabilities" ADD CONSTRAINT "barber_availabilities_weekday" CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "barber_availabilities" ADD CONSTRAINT "barber_availabilities_minutes" CHECK (
  "start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute"
  AND "start_minute" % 15 = 0 AND "end_minute" % 15 = 0
);
ALTER TABLE "barber_availabilities" ADD CONSTRAINT "barber_availabilities_validity" CHECK (
  "valid_until" IS NULL OR "valid_until" >= "valid_from"
);
-- R20: o mesmo barbeiro não tem janelas sobrepostas, em nenhuma barbearia, em vigências que se cruzam.
-- daterange com fim NULL = sem fim; '[]' = datas inclusivas. btree_gist já foi criada (allowed_shifts).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "barber_availabilities" ADD CONSTRAINT "barber_availabilities_no_overlap" EXCLUDE USING gist (
  "user_id" WITH =,
  "weekday" WITH =,
  int4range("start_minute", "end_minute", '[)') WITH &&,
  daterange("valid_from", "valid_until", '[]') WITH &&
);
