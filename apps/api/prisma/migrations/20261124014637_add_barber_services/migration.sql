-- CreateTable
CREATE TABLE "barber_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "price_cents" INTEGER,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "barber_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_services_service_id_idx" ON "barber_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "barber_services_membership_id_service_id_key" ON "barber_services"("membership_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "barber_memberships_id_barbershop_id_key" ON "barber_memberships"("id", "barbershop_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_id_barbershop_id_key" ON "services"("id", "barbershop_id");

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_membership_id_barbershop_id_fkey" FOREIGN KEY ("membership_id", "barbershop_id") REFERENCES "barber_memberships"("id", "barbershop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_service_id_barbershop_id_fkey" FOREIGN KEY ("service_id", "barbershop_id") REFERENCES "services"("id", "barbershop_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Garantias de domínio no banco (manual; skill banco-migrations)
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_price_positive" CHECK ("price_cents" IS NULL OR "price_cents" > 0);
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_duration_step" CHECK (
  "duration_minutes" IS NULL OR ("duration_minutes" >= 15 AND "duration_minutes" % 15 = 0)
);
