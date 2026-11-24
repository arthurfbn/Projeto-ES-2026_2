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

/** O que o convidado já tem nesta barbearia (R11). */
export type InviteeSituation = {
  isManager: boolean
  /** Vínculo de barbeiro aqui: ativo, inativo ou nenhum. */
  membership: 'active' | 'inactive' | null
  /** Tipos de convite pendente (não expirado) que ele já tem aqui. */
  pendingKinds: InvitationKind[]
}

export type InvitationError =
  | 'USER_NOT_FOUND'
  | 'ALREADY_INVITED'
  | 'ALREADY_MANAGER'
  | 'ALREADY_BARBER'
  | 'INACTIVE_MEMBERSHIP'

/**
 * R10, R11: o gerente convida um usuário já cadastrado (sem conta → USER_NOT_FOUND). Não convida
 * quem já tem aquele perfil aqui, nem repete convite pendente do mesmo tipo. Quem tem vínculo
 * inativo aqui é reativado pelo gerente, não convidado. Exclusividade só no convite de barbeiro.
 */
export function planInvitation(input: {
  barbershopId: string
  invitedByUserId: string
  invitee: { id: string; situation: InviteeSituation } | null
  kind: InvitationKind
  isExclusive: boolean
  now: Date
}): Result<NewInvitation, InvitationError> {
  const { invitee, kind } = input
  if (!invitee) return fail('USER_NOT_FOUND')

  const { situation } = invitee
  if (kind === 'manager' && situation.isManager) return fail('ALREADY_MANAGER')
  if (kind === 'barber' && situation.membership === 'active') return fail('ALREADY_BARBER')
  if (kind === 'barber' && situation.membership === 'inactive') return fail('INACTIVE_MEMBERSHIP')
  if (situation.pendingKinds.includes(kind)) return fail('ALREADY_INVITED')

  return ok({
    barbershopId: input.barbershopId,
    invitedByUserId: input.invitedByUserId,
    inviteeUserId: invitee.id,
    kind,
    isExclusive: kind === 'barber' && input.isExclusive,
    expiresAt: addDays(input.now, INVITATION_TTL_DAYS),
  })
}

export type InvitationRecord = {
  id: string
  barbershopId: string
  invitedByUserId: string
  inviteeUserId: string
  kind: InvitationKind
  isExclusive: boolean
  status: InvitationStatus
  expiresAt: Date
}

/** R12: expiração decidida no momento de agir, sem job (ADR-0018). */
export function isExpired(invitation: Pick<InvitationRecord, 'expiresAt'>, now: Date): boolean {
  return now.getTime() >= invitation.expiresAt.getTime()
}

/** Vínculo ativo do convidado em outra barbearia (R14b, R14c). */
export type OtherMembership = {
  id: string
  barbershopId: string
  barbershopName: string
  isExclusive: boolean
}

export type InvitationGrant =
  | { kind: 'manager'; barbershopId: string; managerUserId: string }
  | { kind: 'barber'; barbershopId: string; membership: NewBarberMembership }

export type InvitationAcceptancePlan = {
  invitationId: string
  acceptedAt: Date
  grant: InvitationGrant
  /** R14c: vínculos em outras barbearias desativados no aceite de um convite exclusivo. */
  deactivateMembershipIds: string[]
}

export type AcceptanceError =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_NOT_PENDING'
  | 'INVITATION_EXPIRED'
  | 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE'
  | 'LEAVE_CONFIRMATION_REQUIRED'

/** Estado que permite responder: é do convidado (quando for o caso), pendente e não expirado. */
function checkOpen(
  invitation: InvitationRecord,
  now: Date,
): Result<null, 'INVITATION_NOT_PENDING' | 'INVITATION_EXPIRED'> {
  if (invitation.status !== 'pending') return fail('INVITATION_NOT_PENDING')
  if (isExpired(invitation, now)) return fail('INVITATION_EXPIRED')
  return ok(null)
}

/**
 * R12–R14c: só o convidado aceita, só convite pendente e não expirado.
 * - Gerente: cria a gerência.
 * - Barbeiro: cria o vínculo contratado no aceite, aprovado por quem convidou, ativo, aceitando
 *   agendamentos e com a exclusividade proposta. Com vínculo exclusivo ativo em outra barbearia,
 *   não aceita (R14b). Convite exclusivo com outros vínculos ativos exige confirmar a saída, e
 *   então esses vínculos são desativados (R14c).
 */
export function planInvitationAcceptance(input: {
  invitation: InvitationRecord
  userId: string
  now: Date
  otherMemberships: OtherMembership[]
  confirmLeave: boolean
}): Result<InvitationAcceptancePlan, AcceptanceError> {
  const { invitation, userId, now, otherMemberships } = input
  if (invitation.inviteeUserId !== userId) return fail('INVITATION_NOT_FOUND')
  const open = checkOpen(invitation, now)
  if (!open.ok) return open

  const base = { invitationId: invitation.id, acceptedAt: now }
  if (invitation.kind === 'manager') {
    return ok({
      ...base,
      grant: { kind: 'manager', barbershopId: invitation.barbershopId, managerUserId: userId },
      deactivateMembershipIds: [],
    })
  }

  if (otherMemberships.some((membership) => membership.isExclusive)) return fail('EXCLUSIVE_MEMBERSHIP_ELSEWHERE')
  const mustLeave = invitation.isExclusive && otherMemberships.length > 0
  if (mustLeave && !input.confirmLeave) return fail('LEAVE_CONFIRMATION_REQUIRED')

  return ok({
    ...base,
    grant: {
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
    },
    deactivateMembershipIds: mustLeave ? otherMemberships.map((membership) => membership.id) : [],
  })
}

export type InvitationClosing = {
  invitationId: string
  status: Extract<InvitationStatus, 'declined' | 'canceled'>
  respondedAt: Date
}

/**
 * R13: o convidado recusa; o gerente da barbearia (já autorizado na rota) cancela.
 * Só convite pendente e não expirado muda de estado.
 */
export function planInvitationClosing(input: {
  invitation: InvitationRecord
  as: 'invitee' | 'manager'
  userId: string
  now: Date
}): Result<InvitationClosing, 'INVITATION_NOT_FOUND' | 'INVITATION_NOT_PENDING' | 'INVITATION_EXPIRED'> {
  const { invitation, now } = input
  if (input.as === 'invitee' && invitation.inviteeUserId !== input.userId) return fail('INVITATION_NOT_FOUND')
  const open = checkOpen(invitation, now)
  if (!open.ok) return open

  return ok({
    invitationId: invitation.id,
    status: input.as === 'invitee' ? 'declined' : 'canceled',
    respondedAt: now,
  })
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}
