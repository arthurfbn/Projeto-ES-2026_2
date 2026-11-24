import { fail, ok, type Result } from '../../../shared/result'
import type { BarbershopPorts, BarbershopRecord, MembershipRecord } from './ports'

export type OwnMembershipView = Omit<MembershipRecord, 'userId'> & {
  barbershop: BarbershopRecord
  approvedBy: { name: string }
}

/**
 * Página do vínculo (ADR-0022): só o próprio barbeiro a vê. Para qualquer outro usuário,
 * inclusive gerente da barbearia, o vínculo "não existe" (skill seguranca-authz).
 */
export async function getOwnMembership(
  ports: BarbershopPorts,
  input: { membershipId: string; userId: string },
): Promise<Result<OwnMembershipView, 'MEMBERSHIP_NOT_FOUND'>> {
  const found = await ports.memberships.findWithOrigin(input.membershipId)
  if (!found || found.userId !== input.userId) return fail('MEMBERSHIP_NOT_FOUND')

  const [barbershop, names] = await Promise.all([
    ports.barbershops.findById(found.barbershopId),
    ports.users.findNamesByIds([found.approvedByUserId]),
  ])
  if (!barbershop) return fail('MEMBERSHIP_NOT_FOUND')

  return ok({
    id: found.id,
    hiredAt: found.hiredAt,
    isExclusive: found.isExclusive,
    acceptsAppointments: found.acceptsAppointments,
    isActive: found.isActive,
    shift: found.shift,
    barbershop,
    approvedBy: { name: names.get(found.approvedByUserId) ?? '' },
  })
}
