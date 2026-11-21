import { describe, expect, it } from 'vitest'
import { fieldErrors } from './auth'
import { createServiceRequestSchema, updateServiceRequestSchema } from './services'

const valid = { name: ' Corte ', priceCents: 4000, durationMinutes: 30 }

function errorsOf(schema: typeof createServiceRequestSchema | typeof updateServiceRequestSchema, input: unknown) {
  const result = schema.safeParse(input)
  return result.success ? {} : fieldErrors(result.error)
}

describe('createServiceRequestSchema (R9)', () => {
  it('CA7: aceita 30 min e R$ 40,00 e apara o nome', () => {
    expect(createServiceRequestSchema.parse(valid)).toEqual({ name: 'Corte', priceCents: 4000, durationMinutes: 30 })
  })

  it.each([20, 10, 0, 22.5])('CA7: recusa duração de %s min no campo', (durationMinutes) => {
    expect(errorsOf(createServiceRequestSchema, { ...valid, durationMinutes })).toEqual({
      durationMinutes: 'A duração precisa ser de 15 em 15 minutos (mínimo 15).',
    })
  })

  it.each([0, -1, 40.5])('recusa preço de %s centavos no campo', (priceCents) => {
    expect(errorsOf(createServiceRequestSchema, { ...valid, priceCents })).toEqual({
      priceCents: 'Informe um preço maior que zero.',
    })
  })

  it('exige nome', () => {
    expect(errorsOf(createServiceRequestSchema, { ...valid, name: '  ' })).toHaveProperty('name')
  })

  it('rejeita campos desconhecidos', () => {
    expect(createServiceRequestSchema.safeParse({ ...valid, barbershopId: 'x' }).success).toBe(false)
  })
})

describe('updateServiceRequestSchema', () => {
  it('aceita alterar só parte dos campos, inclusive desativar', () => {
    expect(updateServiceRequestSchema.parse({ priceCents: 5000 })).toEqual({ priceCents: 5000 })
    expect(updateServiceRequestSchema.parse({ isActive: false })).toEqual({ isActive: false })
  })

  it('aplica as mesmas regras de preço e duração', () => {
    expect(errorsOf(updateServiceRequestSchema, { durationMinutes: 20 })).toHaveProperty('durationMinutes')
    expect(errorsOf(updateServiceRequestSchema, { priceCents: 0 })).toHaveProperty('priceCents')
  })

  it('recusa pedido vazio', () => {
    expect(updateServiceRequestSchema.safeParse({}).success).toBe(false)
  })
})
