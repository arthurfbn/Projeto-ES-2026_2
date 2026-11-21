import { describe, expect, it } from 'vitest'
import { checkServiceTerms } from './service-terms'

describe('checkServiceTerms (R9)', () => {
  it('CA7: aceita 30 min e R$ 40,00', () => {
    expect(checkServiceTerms({ priceCents: 4000, durationMinutes: 30 })).toEqual({
      ok: true,
      value: { priceCents: 4000, durationMinutes: 30 },
    })
  })

  it.each([15, 45, 60, 240])('aceita %i min (múltiplo de 15, a partir de 15)', (durationMinutes) => {
    expect(checkServiceTerms({ priceCents: 1, durationMinutes }).ok).toBe(true)
  })

  it.each([20, 10, 0, -15, 7.5])('CA7: recusa %s min', (durationMinutes) => {
    expect(checkServiceTerms({ priceCents: 4000, durationMinutes })).toEqual({ ok: false, error: 'INVALID_DURATION' })
  })

  it.each([0, -100, 40.5])('recusa preço %s centavos', (priceCents) => {
    expect(checkServiceTerms({ priceCents, durationMinutes: 30 })).toEqual({ ok: false, error: 'INVALID_PRICE' })
  })
})
