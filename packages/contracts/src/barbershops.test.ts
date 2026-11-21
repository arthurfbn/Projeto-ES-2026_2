import { describe, expect, it } from 'vitest'
import { fieldErrors } from './auth'
import { BRAZILIAN_STATES, createBarbershopRequestSchema } from './barbershops'

const valid = {
  name: ' Barbearia do Zé ',
  cep: '01310-100',
  street: 'Avenida Paulista',
  number: '1578',
  complement: '',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'sp',
  alsoBarber: true,
}

/** Cópia do pedido válido sem um dos campos. */
function without(field: keyof typeof valid) {
  return Object.fromEntries(Object.entries(valid).filter(([key]) => key !== field))
}

function errorsOf(input: Record<string, unknown>) {
  const result = createBarbershopRequestSchema.safeParse(input)
  return result.success ? {} : fieldErrors(result.error)
}

describe('createBarbershopRequestSchema (R7)', () => {
  it('normaliza CEP para só dígitos, UF para maiúsculas e apara os textos', () => {
    const parsed = createBarbershopRequestSchema.parse(valid)
    expect(parsed).toMatchObject({ name: 'Barbearia do Zé', cep: '01310100', state: 'SP', alsoBarber: true })
  })

  it('complemento vazio vira ausente (é opcional)', () => {
    expect(createBarbershopRequestSchema.parse(valid).complement).toBeUndefined()
    expect(createBarbershopRequestSchema.parse(without('complement')).complement).toBeUndefined()
    expect(createBarbershopRequestSchema.parse({ ...valid, complement: ' Sala 3 ' }).complement).toBe('Sala 3')
  })

  it('"eu também atendo" é desmarcado quando não vem', () => {
    expect(createBarbershopRequestSchema.parse(without('alsoBarber')).alsoBarber).toBe(false)
  })

  it.each([
    ['com 7 dígitos', '0131010'],
    ['com 9 dígitos', '013101000'],
    ['vazio', ''],
  ])('CA6: recusa CEP %s com erro no campo', (_caso, cep) => {
    expect(errorsOf({ ...valid, cep })).toEqual({ cep: 'Informe o CEP com 8 dígitos.' })
  })

  it.each(['XX', 'S', 'São Paulo', ''])('CA6: recusa UF inexistente "%s" com erro no campo', (state) => {
    expect(errorsOf({ ...valid, state })).toEqual({ state: 'Informe a sigla de um estado (ex.: SP).' })
  })

  it('aceita as 27 UFs', () => {
    expect(BRAZILIAN_STATES).toHaveLength(27)
    for (const state of BRAZILIAN_STATES) {
      expect(createBarbershopRequestSchema.safeParse({ ...valid, state }).success).toBe(true)
    }
  })

  it.each(['name', 'street', 'number', 'neighborhood', 'city'])('exige %s preenchido', (field) => {
    expect(errorsOf({ ...valid, [field]: '   ' })).toHaveProperty(field)
  })

  it('rejeita campos desconhecidos', () => {
    expect(createBarbershopRequestSchema.safeParse({ ...valid, barbershopId: 'x' }).success).toBe(false)
  })
})
