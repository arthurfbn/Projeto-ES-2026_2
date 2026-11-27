import { describe, expect, it } from 'vitest'
import { barbershopSearchQuerySchema } from './discovery'

describe('barbershopSearchQuerySchema (R1, R2)', () => {
  it('aceita texto, serviço ou os dois, sem espaços sobrando', () => {
    expect(barbershopSearchQuerySchema.parse({ q: ' bela vista ' })).toEqual({ q: 'bela vista' })
    expect(barbershopSearchQuerySchema.parse({ service: 'corte' })).toEqual({ service: 'corte' })
    expect(barbershopSearchQuerySchema.parse({ q: 'navalha', service: 'corte' })).toEqual({ q: 'navalha', service: 'corte' })
  })

  it.each([
    ['sem texto nem serviço', {}],
    ['só espaços', { q: '   ' }],
    ['texto longo demais', { q: 'a'.repeat(81) }],
    ['campo desconhecido', { q: 'navalha', city: 'São Paulo' }],
  ])('recusa %s', (_caso, query) => {
    expect(barbershopSearchQuerySchema.safeParse(query).success).toBe(false)
  })
})
