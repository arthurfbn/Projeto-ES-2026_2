import { describe, expect, it } from 'vitest'
import { fieldErrors } from './auth'
import { createAvailabilityRequestSchema } from './availability'

const valid = { weekday: 1, startMinute: 600, endMinute: 720, validFrom: '2026-11-30' }

function errorsOf(input: unknown) {
  const result = createAvailabilityRequestSchema.safeParse(input)
  return result.success ? {} : fieldErrors(result.error)
}

describe('createAvailabilityRequestSchema (R17, R18)', () => {
  it('aceita janela semanal com vigência sem fim (fim vira null)', () => {
    expect(createAvailabilityRequestSchema.parse(valid)).toEqual({ ...valid, validUntil: null })
  })

  it('aceita vigência com fim', () => {
    expect(createAvailabilityRequestSchema.parse({ ...valid, validUntil: '2026-12-31' }).validUntil).toBe('2026-12-31')
  })

  it.each([
    ['início depois do fim', { startMinute: 720, endMinute: 600 }, 'endMinute'],
    ['fora do passo de 15 min', { startMinute: 610 }, 'startMinute'],
    ['passando da meia-noite', { endMinute: 1455 }, 'endMinute'],
  ])('R18: recusa %s, com erro no campo do horário errado', (_caso, change, field) => {
    expect(errorsOf({ ...valid, ...change })).toEqual({
      [field]: 'Confira os horários: início antes do fim, de 15 em 15 minutos.',
    })
  })

  it('recusa dia da semana inexistente', () => {
    expect(errorsOf({ ...valid, weekday: 7 })).toHaveProperty('weekday')
  })

  it('R17: exige início da vigência em data válida', () => {
    expect(errorsOf({ ...valid, validFrom: '30/11/2026' })).toHaveProperty('validFrom')
    expect(errorsOf({ ...valid, validFrom: undefined })).toHaveProperty('validFrom')
  })

  it('R17: fim da vigência antes do início dá erro no fim', () => {
    expect(errorsOf({ ...valid, validUntil: '2026-11-01' })).toEqual({
      validUntil: 'O fim da vigência precisa ser no início ou depois dele.',
    })
  })

  it('rejeita campos desconhecidos', () => {
    expect(createAvailabilityRequestSchema.safeParse({ ...valid, barbershopId: 'x' }).success).toBe(false)
  })
})
