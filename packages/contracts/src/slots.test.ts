import { describe, expect, it } from 'vitest'
import { slotsQuerySchema } from './slots'

describe('slotsQuerySchema (R5, R8)', () => {
  it('aceita só a data: "qualquer barbeiro"', () => {
    expect(slotsQuerySchema.parse({ date: '2026-11-30' })).toEqual({ date: '2026-11-30' })
  })

  it('aceita a data com o vínculo do barbeiro escolhido', () => {
    const membershipId = '7d1f0c1e-5b4a-4c59-9a3e-0f6a2b1c3d4e'
    expect(slotsQuerySchema.parse({ date: '2026-11-30', membershipId }).membershipId).toBe(membershipId)
  })

  it.each([
    ['data em outro formato', { date: '30/11/2026' }],
    ['sem data', {}],
    ['vínculo que não é id', { date: '2026-11-30', membershipId: 'leo' }],
    ['campo desconhecido', { date: '2026-11-30', barber: 'leo' }],
  ])('recusa %s', (_caso, query) => {
    expect(slotsQuerySchema.safeParse(query).success).toBe(false)
  })
})
