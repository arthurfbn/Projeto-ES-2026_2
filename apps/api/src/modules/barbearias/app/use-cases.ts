import { fail, ok, type Result } from '../../../shared/result'
import { planBarbershopCreation } from '../core/barbershop-creation'
import type { BarbershopPorts, BarbershopRecord, BarbershopRoles, NewBarbershop } from './ports'

export type BarbershopView = { barbershop: BarbershopRecord; roles: BarbershopRoles }

/** R7, R8, R14b: cria a barbearia; o criador vira gerente e, se pediu, barbeiro. */
export async function createBarbershop(
  ports: BarbershopPorts,
  input: { creatorId: string; alsoBarber: boolean; barbershop: NewBarbershop },
): Promise<Result<BarbershopView, 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE'>> {
  const plan = planBarbershopCreation({
    creatorId: input.creatorId,
    alsoBarber: input.alsoBarber,
    hasActiveExclusiveMembership: input.alsoBarber
      ? await ports.barbershops.hasActiveExclusiveMembership(input.creatorId)
      : false,
    now: ports.clock.now(),
  })
  if (!plan.ok) return plan

  const barbershop = await ports.barbershops.create(input.barbershop, plan.value)
  return ok({ barbershop, roles: { manager: true, barber: plan.value.membership !== null } })
}

/** Barbearia vista por quem tem perfil nela; para os demais, ela "não existe" (skill seguranca-authz). */
export async function getBarbershop(
  ports: BarbershopPorts,
  input: { barbershopId: string; userId: string },
): Promise<Result<BarbershopView, 'BARBERSHOP_NOT_FOUND'>> {
  const roles = await ports.barbershops.findRoles(input.barbershopId, input.userId)
  if (!roles.manager && !roles.barber) return fail('BARBERSHOP_NOT_FOUND')

  const barbershop = await ports.barbershops.findById(input.barbershopId)
  if (!barbershop) return fail('BARBERSHOP_NOT_FOUND')
  return ok({ barbershop, roles })
}
