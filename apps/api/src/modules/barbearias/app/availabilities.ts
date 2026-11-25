import { fail, ok, type Result } from '../../../shared/result'
import type { WeeklyWindow } from '../core/allowed-shift'
import { planAvailability, type AvailabilityError, type Validity } from '../core/availability'
import type { AvailabilityRecord, BarbershopPorts, MembershipOrigin, MembershipRecord } from './ports'

type NotFound = 'MEMBERSHIP_NOT_FOUND'
type Owner = { membershipId: string; userId: string }

/**
 * R17: só o próprio barbeiro mexe na disponibilidade do vínculo. Para qualquer outro usuário,
 * inclusive o gerente da barbearia, o vínculo "não existe" (skill seguranca-authz).
 */
async function ownMembership(
  ports: BarbershopPorts,
  { membershipId, userId }: Owner,
): Promise<(MembershipRecord & MembershipOrigin) | null> {
  const membership = await ports.memberships.findWithOrigin(membershipId)
  return membership && membership.userId === userId ? membership : null
}

export async function listAvailabilities(
  ports: BarbershopPorts,
  owner: Owner,
): Promise<Result<AvailabilityRecord[], NotFound>> {
  if (!(await ownMembership(ports, owner))) return fail('MEMBERSHIP_NOT_FOUND')
  return ok(await ports.availabilities.listByMembership(owner.membershipId))
}

/** R17–R20: cadastra uma janela semanal com vigência no vínculo do próprio barbeiro. */
export async function createAvailability(
  ports: BarbershopPorts,
  input: Owner & { window: WeeklyWindow; validity: Validity },
): Promise<Result<AvailabilityRecord, NotFound | AvailabilityError>> {
  const membership = await ownMembership(ports, input)
  if (!membership) return fail('MEMBERSHIP_NOT_FOUND')

  const plan = planAvailability({
    window: input.window,
    validity: input.validity,
    membership,
    existing: await ports.availabilities.listForBarber(input.userId),
  })
  if (!plan.ok) return plan

  return ports.availabilities.create({
    ...plan.value,
    membershipId: membership.id,
    barbershopId: membership.barbershopId,
    userId: input.userId,
  })
}

export async function removeAvailability(
  ports: BarbershopPorts,
  input: Owner & { availabilityId: string },
): Promise<Result<void, NotFound | 'AVAILABILITY_NOT_FOUND'>> {
  if (!(await ownMembership(ports, input))) return fail('MEMBERSHIP_NOT_FOUND')
  const removed = await ports.availabilities.remove(input.membershipId, input.availabilityId)
  return removed ? ok(undefined) : fail('AVAILABILITY_NOT_FOUND')
}
