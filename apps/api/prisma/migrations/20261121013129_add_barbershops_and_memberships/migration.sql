-- CreateTable
CREATE TABLE "barbershops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "barbershops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbershop_managers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barbershop_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hired_at" TIMESTAMPTZ NOT NULL,
    "approved_by_user_id" UUID NOT NULL,
    "is_exclusive" BOOLEAN NOT NULL,
    "accepts_appointments" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "barber_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barbershop_managers_user_id_idx" ON "barbershop_managers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "barbershop_managers_barbershop_id_user_id_key" ON "barbershop_managers"("barbershop_id", "user_id");

-- CreateIndex
CREATE INDEX "barber_memberships_user_id_idx" ON "barber_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "barber_memberships_barbershop_id_user_id_key" ON "barber_memberships"("barbershop_id", "user_id");

-- AddForeignKey
ALTER TABLE "barbershop_managers" ADD CONSTRAINT "barbershop_managers_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbershop_managers" ADD CONSTRAINT "barbershop_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_memberships" ADD CONSTRAINT "barber_memberships_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_memberships" ADD CONSTRAINT "barber_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_memberships" ADD CONSTRAINT "barber_memberships_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantias de domínio no banco (manual; skill banco-migrations)
ALTER TABLE "barbershops" ADD CONSTRAINT "barbershops_cep_digits" CHECK ("cep" ~ '^[0-9]{8}$');
ALTER TABLE "barbershops" ADD CONSTRAINT "barbershops_state_uf" CHECK ("state" IN (
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
));
ALTER TABLE "barbershops" ADD CONSTRAINT "barbershops_name_not_blank" CHECK (length(btrim("name")) > 0);
