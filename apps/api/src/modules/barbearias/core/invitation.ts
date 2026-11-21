import { fail, ok, type Result } from '../../../shared/result'
import type { NewBarberMembership } from './barbershop-creation'

/** Convite (CONTEXT.md, "Convite"; ADR-0018): para ser barbeiro (vínculo) ou gerente da barbearia. */
export type InvitationKind = 'barber' | 'manager'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired'

/** Convite pendente expira 7 dias depois de criado (R12). */
export const INVITATION_TTL_DAYS = 7

export type NewInvitation = {
  barbershopId: string
  invitedByUserId: string
  inviteeUserId: string
  kind: InvitationKind
  isExclusive: boolean
  expiresAt: Date
}

/**
 * R10: o gerente convida um usuário já cadastrado (sem conta → USER_NOT_FOUND, sem convite).
 * Exclusividade só faz sentido no convite de barbeiro.
 */
export function planInvitation(input: {
  barbershopId: string
  invitedByUserId: string
  invitee: { id: string } | null
  kind: InvitationKind
  isExclusive: boolean
  now: Date
}): Result<NewInvitation, 'USER_NOT_FOUND'> {
  if (!input.invitee) return fail('USER_NOT_FOUND')

  return ok({
    barbershopId: input.barbershopId,
    invitedByUserId: input.invitedByUserId,
    inviteeUserId: input.invitee.id,
    kind: input.kind,
    isExclusive: input.kind === 'barber' && input.isExclusive,
    expiresAt: addDays(input.now, INVITATION_TTL_DAYS),
  })
}

export type PendingInvitation = {
  id: string
  barbershopId: string
  invitedByUserId: string
  inviteeUserId: string
  kind: InvitationKind
  isExclusive: boolean
  status: InvitationStatus
}

export type InvitationGrant =
  | { kind: 'manager'; barbershopId: string; managerUserId: string }
  | { kind: 'barber'; barbershopId: string; membership: NewBarberMembership }

export type InvitationAcceptancePlan = {
  invitationId: string
  acceptedAt: Date
  grant: InvitationGrant
}

/**
 * R13, R14: só o convidado aceita, e só convite pendente. Convite de gerente cria a gerência;
 * de barbeiro cria o vínculo contratado no aceite, aprovado por quem convidou, ativo, aceitando
 * agendamentos e com a exclusividade proposta.
 */
export function planInvitationAcceptance(input: {
  invitation: PendingInvitation
  userId: string
  now: Date
}): Result<InvitationAcceptancePlan, 'INVITATION_NOT_FOUND' | 'INVITATION_NOT_PENDING'> {
  const { invitation, userId, now } = input
  if (invitation.inviteeUserId !== userId) return fail('INVITATION_NOT_FOUND')
  if (invitation.status !== 'pending') return fail('INVITATION_NOT_PENDING')

  const grant: InvitationGrant =
    invitation.kind === 'manager'
      ? { kind: 'manager', barbershopId: invitation.barbershopId, managerUserId: userId }
      : {
          kind: 'barber',
          barbershopId: invitation.barbershopId,
          membership: {
            barberUserId: userId,
            hiredAt: now,
            approvedByUserId: invitation.invitedByUserId,
            isExclusive: invitation.isExclusive,
            acceptsAppointments: true,
            isActive: true,
          },
        }

  return ok({ invitationId: invitation.id, acceptedAt: now, grant })
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}
