import { fail, ok, type Result } from '../../../shared/result'
import { planInvitation, planInvitationAcceptance, type InvitationKind } from '../core/invitation'
import type { BarbershopPorts, ReceivedInvitationRecord, SentInvitationRecord } from './ports'

/** R10: gerente (já autorizado na rota) convida um usuário cadastrado pelo e-mail. */
export async function inviteToBarbershop(
  ports: BarbershopPorts,
  input: { barbershopId: string; invitedByUserId: string; email: string; kind: InvitationKind; isExclusive: boolean },
): Promise<Result<SentInvitationRecord, 'USER_NOT_FOUND'>> {
  const plan = planInvitation({
    barbershopId: input.barbershopId,
    invitedByUserId: input.invitedByUserId,
    invitee: await ports.users.findIdByEmail(input.email),
    kind: input.kind,
    isExclusive: input.isExclusive,
    now: ports.clock.now(),
  })
  if (!plan.ok) return plan
  return ok(await ports.invitations.create(plan.value))
}

/** ADR-0018: o convidado vê os convites pendentes ao entrar. */
export function listReceivedInvitations(ports: BarbershopPorts, userId: string): Promise<ReceivedInvitationRecord[]> {
  return ports.invitations.listPendingForInvitee(userId)
}

/** R13, R14: o convidado aceita; nasce a gerência ou o vínculo. */
export async function acceptInvitation(
  ports: BarbershopPorts,
  input: { invitationId: string; userId: string },
): Promise<
  Result<{ barbershopId: string; kind: InvitationKind }, 'INVITATION_NOT_FOUND' | 'INVITATION_NOT_PENDING'>
> {
  const invitation = await ports.invitations.findById(input.invitationId)
  if (!invitation) return fail('INVITATION_NOT_FOUND')

  const plan = planInvitationAcceptance({ invitation, userId: input.userId, now: ports.clock.now() })
  if (!plan.ok) return plan

  const accepted = await ports.invitations.accept(plan.value)
  if (!accepted) return fail('INVITATION_NOT_PENDING')
  return ok({ barbershopId: invitation.barbershopId, kind: invitation.kind })
}
