-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('online', 'on_site');

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "client_user_id" UUID NOT NULL,
    "barber_user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "status" "appointment_status" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_barber_user_id_starts_at_idx" ON "appointments"("barber_user_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_barbershop_id_starts_at_idx" ON "appointments"("barbershop_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_client_user_id_starts_at_idx" ON "appointments"("client_user_id", "starts_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_membership_id_barbershop_id_barber_user_id_fkey" FOREIGN KEY ("membership_id", "barbershop_id", "barber_user_id") REFERENCES "barber_memberships"("id", "barbershop_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_barbershop_id_fkey" FOREIGN KEY ("service_id", "barbershop_id") REFERENCES "services"("id", "barbershop_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Garantias de domínio no banco (manual; skill banco-migrations)
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_interval" CHECK (
  "duration_minutes" > 0 AND "ends_at" = "starts_at" + make_interval(mins => "duration_minutes")
);
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_price" CHECK ("price_cents" > 0);
-- R11: dois agendamentos ativos do mesmo barbeiro nunca se sobrepõem, em nenhuma barbearia (ADR-0013).
-- btree_gist já foi criada (allowed_shifts).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap" EXCLUDE USING gist (
  "barber_user_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
) WHERE ("status" IN ('pending', 'confirmed', 'in_progress'));
