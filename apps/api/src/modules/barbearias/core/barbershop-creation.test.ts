import { describe, expect, it } from 'vitest'
import { planBarbershopCreation } from './barbershop-creation'

const creatorId = '11111111-1111-4111-8111-111111111111'
const now = new Date('2026-11-21T10:00:00-03:00')

describe('planBarbershopCreation (R8, R14b)', () => {
  it('CA5: sem "eu também atendo", o criador vira só gerente', () => {
    const result = planBarbershopCreation({ creatorId, alsoBarber: false, hasActiveExclusiveMembership: false, now })

    expect(result).toEqual({ ok: true, value: { managerUserId: creatorId, membership: null } })
  })

  it('CA5: com "eu também atendo", vira gerente e barbeiro com vínculo ativo, aprovado por ele mesmo', () => {
    const result = planBarbershopCreation({ creatorId, alsoBarber: true, hasActiveExclusiveMembership: false, now })

    expect(result).toEqual({
      ok: true,
      value: {
        managerUserId: creatorId,
        membership: {
          barberUserId: creatorId,
          hiredAt: now,
          approvedByUserId: creatorId,
          isExclusive: false,
          acceptsAppointments: true,
          isActive: true,
        },
      },
    })
  })

  it('R14b: com vínculo exclusivo ativo em outra barbearia, não pode marcar "eu também atendo"', () => {
    const result = planBarbershopCreation({ creatorId, alsoBarber: true, hasActiveExclusiveMembership: true, now })

    expect(result).toEqual({ ok: false, error: 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE' })
  })

  it('R14b: com vínculo exclusivo, ainda pode criar a barbearia só como gerente', () => {
    const result = planBarbershopCreation({ creatorId, alsoBarber: false, hasActiveExclusiveMembership: true, now })

    expect(result.ok).toBe(true)
  })
})
