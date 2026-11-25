import { describe, expect, it } from 'vitest'
import { fieldErrors } from './auth'
import { setBarberServiceRequestSchema } from './barber-services'

function errorsOf(input: unknown) {
  const result = setBarberServiceRequestSchema.safeParse(input)
  return result.success ? {} : fieldErrors(result.error)
}

describe('setBarberServiceRequestSchema (R16)', () => {
  it('CA15: aceita preço próprio sem duração própria', () => {
    expect(setBarberServiceRequestSchema.parse({ priceCents: 5000, durationMinutes: null })).toEqual({
      priceCents: 5000,
      durationMinutes: null,
    })
  })

  it('valores ausentes viram null (vale o padrão)', () => {
    expect(setBarberServiceRequestSchema.parse({})).toEqual({ priceCents: null, durationMinutes: null })
  })

  it('duração própria de 20 min dá erro no campo (mesma regra do R9)', () => {
    expect(errorsOf({ durationMinutes: 20 })).toEqual({
      durationMinutes: 'A duração precisa ser de 15 em 15 minutos (mínimo 15).',
    })
  })

  it('preço próprio zero dá erro no campo', () => {
    expect(errorsOf({ priceCents: 0 })).toEqual({ priceCents: 'Informe um preço maior que zero.' })
  })

  it('rejeita campos desconhecidos', () => {
    expect(setBarberServiceRequestSchema.safeParse({ serviceId: 'x' }).success).toBe(false)
  })
})
