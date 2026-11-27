import { fail, ok, type Result } from '../../../shared/result'

/** Vínculo de barbeiro a criar (CONTEXT.md, "Vínculo"). */
export type NewBarberMembership = {
  barberUserId: string
  hiredAt: Date
  approvedByUserId: string
  isExclusive: boolean
  acceptsAppointments: boolean
  isActive: boolean
}

export type BarbershopCreationPlan = {
  managerUserId: string
  membership: NewBarberMembership | null
}

/**
 * Quem cria a barbearia vira gerente na hora (R8). Com "eu também atendo", ganha também vínculo
 * de barbeiro: contratado agora, aprovado por ele mesmo, ativo, aceitando agendamentos e não
 * exclusivo. Quem tem vínculo exclusivo ativo não pode atender em outra barbearia (R14b).
 */
export function planBarbershopCreation(input: {
  creatorId: string
  alsoBarber: boolean
  hasActiveExclusiveMembership: boolean
  now: Date
}): Result<BarbershopCreationPlan, 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE'> {
  const { creatorId, alsoBarber, hasActiveExclusiveMembership, now } = input
  if (!alsoBarber) return ok({ managerUserId: creatorId, membership: null })
  if (hasActiveExclusiveMembership) return fail('EXCLUSIVE_MEMBERSHIP_ELSEWHERE')

  return ok({
    managerUserId: creatorId,
    membership: {
      barberUserId: creatorId,
      hiredAt: now,
      approvedByUserId: creatorId,
      isExclusive: false,
      acceptsAppointments: true,
      isActive: true,
    },
  })
}
