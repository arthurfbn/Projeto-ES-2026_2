-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_barbershop_id_idx" ON "services"("barbershop_id");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantias de domínio no banco (manual; skill banco-migrations)
ALTER TABLE "services" ADD CONSTRAINT "services_price_positive" CHECK ("price_cents" > 0);
ALTER TABLE "services" ADD CONSTRAINT "services_duration_step" CHECK ("duration_minutes" >= 15 AND "duration_minutes" % 15 = 0);
ALTER TABLE "services" ADD CONSTRAINT "services_name_not_blank" CHECK (length(btrim("name")) > 0);
