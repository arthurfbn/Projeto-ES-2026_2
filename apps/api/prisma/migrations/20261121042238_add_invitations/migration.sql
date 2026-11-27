-- CreateEnum
CREATE TYPE "invitation_kind" AS ENUM ('barber', 'manager');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'declined', 'canceled', 'expired');

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barbershop_id" UUID NOT NULL,
    "invitee_user_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "kind" "invitation_kind" NOT NULL,
    "is_exclusive" BOOLEAN NOT NULL,
    "status" "invitation_status" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "responded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitations_barbershop_id_status_idx" ON "invitations"("barbershop_id", "status");

-- CreateIndex
CREATE INDEX "invitations_invitee_user_id_status_idx" ON "invitations"("invitee_user_id", "status");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantias de domínio no banco (manual; skill banco-migrations)
-- Exclusividade é proposta só no convite de barbeiro (R10).
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_exclusive_only_barber" CHECK ("kind" = 'barber' OR NOT "is_exclusive");
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_expires_after_created" CHECK ("expires_at" > "created_at");
-- Respondido (aceito/recusado/cancelado) tem data de resposta; pendente não tem.
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_responded_at_matches_status" CHECK (("status" = 'pending') = ("responded_at" IS NULL) OR "status" = 'expired');
