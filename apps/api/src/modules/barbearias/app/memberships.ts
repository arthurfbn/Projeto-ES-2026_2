import { fail, ok, type Result } from '../../../shared/result'
import { checkReactivation, planShiftChange, type WeeklyWindow } from '../core/allowed-shift'
import type { BarbershopPorts, MembershipPatch, MembershipRecord } from './ports'

export type MembershipView = Omit<MembershipRecord, 'userId'> & { barber: { id: string; name: string } }

type NotFound = 'MEMBERSHIP_NOT_FOUND'

async function toViews(ports: BarbershopPorts, memberships: MembershipRecord[]): Promise<MembershipView[]> {
  const names = await ports.users.findNamesByIds(memberships.map((membership) => membership.userId))
  return memberships.map(({ userId, ...membership }) => ({
    ...membership,
    barber: { id: userId, name: names.get(userId) ?? '' },
  }))
}

async function viewOf(ports: BarbershopPorts, barbershopId: string, membershipId: string): Promise<MembershipView> {
  const membership = await ports.memberships.findById(barbershopId, membershipId)
  if (!membership) throw new Error(`vínculo ${membershipId} sumiu durante a atualização`)
  const [view] = await toViews(ports, [membership])
  if (!view) throw new Error('vínculo sem visão')
  return view
}

/** Visão do gerente: todos os vínculos da barbearia, ativos e inativos, com o turno. */
export async function listMemberships(ports: BarbershopPorts, barbershopId: string): Promise<MembershipView[]> {
  return toViews(ports, await ports.memberships.listByBarbershop(barbershopId))
}

/** R15, R21: troca o turno; recusa se deixaria disponibilidade do barbeiro de fora. */
export async function updateShift(
  ports: BarbershopPorts,
  input: { barbershopId: string; membershipId: string; windows: WeeklyWindow[] },
): Promise<Result<MembershipView, NotFound | 'INVALID_WINDOW' | 'OVERLAPPING_WINDOWS' | 'AVAILABILITY_OUTSIDE_SHIFT'>> {
  const membership = await ports.memberships.findById(input.barbershopId, input.membershipId)
  if (!membership) return fail('MEMBERSHIP_NOT_FOUND')

  const availability = await ports.availability.weeklyWindows({
    barbershopId: input.barbershopId,
    userId: membership.userId,
  })
  const plan = planShiftChange({ windows: input.windows, availability })
  if (!plan.ok) return plan

  await ports.memberships.replaceShift(membership.id, plan.value)
  return ok(await viewOf(ports, input.barbershopId, membership.id))
}

/** R15: se aceita agendamentos e se está ativo; reativar respeita a exclusividade. */
export async function updateMembership(
  ports: BarbershopPorts,
  input: { barbershopId: string; membershipId: string; patch: MembershipPatch },
): Promise<Result<MembershipView, NotFound | 'EXCLUSIVITY_CONFLICT'>> {
  const membership = await ports.memberships.findById(input.barbershopId, input.membershipId)
  if (!membership) return fail('MEMBERSHIP_NOT_FOUND')

  if (input.patch.isActive === true && !membership.isActive) {
    const elsewhere = await ports.memberships.activeElsewhere(membership.userId, input.barbershopId)
    const check = checkReactivation({
      isExclusive: membership.isExclusive,
      hasActiveExclusiveElsewhere: elsewhere.exclusive,
      hasActiveMembershipElsewhere: elsewhere.any,
    })
    if (!check.ok) return check
  }

  await ports.memberships.update(membership.id, input.patch)
  return ok(await viewOf(ports, input.barbershopId, membership.id))
}
