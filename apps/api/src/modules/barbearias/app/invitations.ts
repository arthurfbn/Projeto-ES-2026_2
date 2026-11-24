import { fail, ok, type Result } from '../../../shared/result'
import {
  planInvitation,
  planInvitationAcceptance,
  planInvitationClosing,
  type AcceptanceError,
  type InvitationError,
  type InvitationKind,
} from '../core/invitation'
import type {
  BarbershopPorts,
  PendingSentInvitationRecord,
  ReceivedInvitationRecord,
  SentInvitationRecord,
} from './ports'

/** R10, R11: gerente (já autorizado na rota) convida um usuário cadastrado pelo e-mail. */
export async function inviteToBarbershop(
  ports: BarbershopPorts,
  input: { barbershopId: string; invitedByUserId: string; email: string; kind: InvitationKind; isExclusive: boolean },
): Promise<Result<SentInvitationRecord, InvitationError>> {
  const now = ports.clock.now()
  const found = await ports.users.findIdByEmail(input.email)
  const invitee = found
    ? { id: found.id, situation: await ports.invitations.findInviteeSituation(input.barbershopId, found.id, now) }
    : null

  const plan = planInvitation({
    barbershopId: input.barbershopId,
    invitedByUserId: input.invitedByUserId,
    invitee,
    kind: input.kind,
    isExclusive: input.isExclusive,
    now,
  })
  if (!plan.ok) return plan
  return ok(await ports.invitations.create(plan.value))
}

/** ADR-0018: o convidado vê os convites pendentes (não expirados) ao entrar. */
export function listReceivedInvitations(ports: BarbershopPorts, userId: string): Promise<ReceivedInvitationRecord[]> {
  return ports.invitations.listPendingForInvitee(userId, ports.clock.now())
}

export type SentInvitationView = Omit<PendingSentInvitationRecord, 'inviteeUserId'> & { invitee: { name: string } }

/** R13: convites pendentes da barbearia, para o gerente acompanhar e cancelar. */
export async function listSentInvitations(ports: BarbershopPorts, barbershopId: string): Promise<SentInvitationView[]> {
  const pending = await ports.invitations.listPendingForBarbershop(barbershopId, ports.clock.now())
  const names = await ports.users.findNamesByIds(pending.map((invitation) => invitation.inviteeUserId))
  return pending.map(({ inviteeUserId, ...invitation }) => ({
    ...invitation,
    invitee: { name: names.get(inviteeUserId) ?? '' },
  }))
}

/**
 * Resultado do aceite. Na falha LEAVE_CONFIRMATION_REQUIRED, `leaving` lista as barbearias de que
 * o barbeiro sairia (R14c); nas demais, vem vazia.
 */
export type AcceptanceOutcome =
  | { ok: true; value: { barbershopId: string; kind: InvitationKind } }
  | { ok: false; error: AcceptanceError; leaving: Array<{ id: string; name: string }> }

const refuse = (error: AcceptanceError, leaving: Array<{ id: string; name: string }> = []): AcceptanceOutcome => ({
  ok: false,
  error,
  leaving,
})

/**
 * R12–R14c: o convidado aceita; nasce a gerência ou o vínculo. Convite que passou da validade é
 * gravado como expirado. Convite exclusivo com outros vínculos devolve de quais barbearias ele sai.
 */
export async function acceptInvitation(
  ports: BarbershopPorts,
  input: { invitationId: string; userId: string; confirmLeave: boolean },
): Promise<AcceptanceOutcome> {
  const invitation = await ports.invitations.findById(input.invitationId)
  if (!invitation) return refuse('INVITATION_NOT_FOUND')

  const otherMemberships =
    invitation.kind === 'barber' && invitation.inviteeUserId === input.userId
      ? await ports.invitations.activeMembershipsElsewhere(input.userId, invitation.barbershopId)
      : []
  const plan = planInvitationAcceptance({
    invitation,
    userId: input.userId,
    now: ports.clock.now(),
    otherMemberships,
    confirmLeave: input.confirmLeave,
  })
  if (!plan.ok) {
    if (plan.error === 'INVITATION_EXPIRED') await ports.invitations.markExpired(invitation.id)
    if (plan.error !== 'LEAVE_CONFIRMATION_REQUIRED') return refuse(plan.error)
    return refuse(
      plan.error,
      otherMemberships.map((membership) => ({ id: membership.barbershopId, name: membership.barbershopName })),
    )
  }

  const accepted = await ports.invitations.accept(plan.value)
  if (!accepted) return refuse('INVITATION_NOT_PENDING')
  return { ok: true, value: { barbershopId: invitation.barbershopId, kind: invitation.kind } }
}

type ClosingError = 'INVITATION_NOT_FOUND' | 'INVITATION_NOT_PENDING' | 'INVITATION_EXPIRED'

/**
 * R13: o convidado recusa (`as: 'invitee'`) ou o gerente cancela (`as: 'manager'`, com o
 * barbershopId já autorizado na rota: convite de outra barbearia "não existe").
 */
export async function closeInvitation(
  ports: BarbershopPorts,
  input: { invitationId: string; userId: string } & ({ as: 'invitee' } | { as: 'manager'; barbershopId: string }),
): Promise<Result<null, ClosingError>> {
  const invitation = await ports.invitations.findById(input.invitationId)
  if (!invitation) return fail('INVITATION_NOT_FOUND')
  if (input.as === 'manager' && invitation.barbershopId !== input.barbershopId) return fail('INVITATION_NOT_FOUND')

  const plan = planInvitationClosing({ invitation, as: input.as, userId: input.userId, now: ports.clock.now() })
  if (!plan.ok) {
    if (plan.error === 'INVITATION_EXPIRED') await ports.invitations.markExpired(invitation.id)
    return plan
  }
  const closed = await ports.invitations.close(plan.value)
  return closed ? ok(null) : fail('INVITATION_NOT_PENDING')
}
