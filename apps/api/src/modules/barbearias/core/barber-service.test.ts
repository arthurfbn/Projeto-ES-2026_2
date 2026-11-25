import { describe, expect, it } from 'vitest'
import { effectiveTerms, planBarberService } from './barber-service'

const corte = { isActive: true, priceCents: 4000, durationMinutes: 30 }

describe('planBarberService (R16)', () => {
  it('CA15: aceita preço próprio de R$ 50 sem duração própria', () => {
    expect(planBarberService({ service: corte, priceCents: 5000, durationMinutes: null })).toEqual({
      ok: true,
      value: { priceCents: 5000, durationMinutes: null },
    })
  })

  it('aceita atribuir sem valores próprios (vale o padrão)', () => {
    expect(planBarberService({ service: corte, priceCents: null, durationMinutes: null })).toEqual({
      ok: true,
      value: { priceCents: null, durationMinutes: null },
    })
  })

  it('aceita duração própria de 45 min', () => {
    expect(planBarberService({ service: corte, priceCents: null, durationMinutes: 45 }).ok).toBe(true)
  })

  it.each([20, 10, 0])('duração própria de %i min dá erro (mesma regra do R9)', (durationMinutes) => {
    expect(planBarberService({ service: corte, priceCents: null, durationMinutes })).toEqual({
      ok: false,
      error: 'INVALID_DURATION',
    })
  })

  it.each([0, -100, 40.5])('preço próprio de %s centavos dá erro', (priceCents) => {
    expect(planBarberService({ service: corte, priceCents, durationMinutes: null })).toEqual({
      ok: false,
      error: 'INVALID_PRICE',
    })
  })

  it('serviço desativado não pode ser atribuído a barbeiro', () => {
    const inactive = { ...corte, isActive: false }
    expect(planBarberService({ service: inactive, priceCents: null, durationMinutes: null })).toEqual({
      ok: false,
      error: 'SERVICE_INACTIVE',
    })
  })
})

describe('effectiveTerms (R16)', () => {
  it('CA15: preço próprio de R$ 50 e duração padrão de 30 min', () => {
    expect(effectiveTerms(corte, { priceCents: 5000, durationMinutes: null })).toEqual({
      priceCents: 5000,
      durationMinutes: 30,
    })
  })

  it('sem valores próprios, vale o padrão do serviço', () => {
    expect(effectiveTerms(corte, { priceCents: null, durationMinutes: null })).toEqual({
      priceCents: 4000,
      durationMinutes: 30,
    })
  })

  it('com os dois próprios, valem os dois', () => {
    expect(effectiveTerms(corte, { priceCents: 6000, durationMinutes: 45 })).toEqual({
      priceCents: 6000,
      durationMinutes: 45,
    })
  })
})
