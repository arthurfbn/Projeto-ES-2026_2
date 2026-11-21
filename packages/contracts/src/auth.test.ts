import { describe, expect, it } from 'vitest'
import { fieldErrors, signupRequestSchema } from './auth'

const valid = {
  name: 'Ana Souza',
  email: 'Ana@Exemplo.com ',
  phone: '(11) 98765-4321',
  password: 'segredo123',
}

describe('signupRequestSchema', () => {
  it('normaliza e-mail para minúsculas e telefone para só dígitos', () => {
    const parsed = signupRequestSchema.parse(valid)
    expect(parsed.email).toBe('ana@exemplo.com')
    expect(parsed.phone).toBe('11987654321')
  })

  it('aceita telefone fixo com DDD (10 dígitos)', () => {
    expect(signupRequestSchema.parse({ ...valid, phone: '11 3456-7890' }).phone).toBe('1134567890')
  })

  it.each([
    ['sem DDD', '98765-4321'],
    ['com 12 dígitos', '119876543210'],
    ['com DDD começando em zero', '01987654321'],
  ])('recusa telefone %s', (_caso, phone) => {
    const result = signupRequestSchema.safeParse({ ...valid, phone })
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty('phone')
  })

  it('exige todos os campos', () => {
    const result = signupRequestSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(['email', 'name', 'password', 'phone'])
    }
  })

  it('recusa senha com menos de 8 caracteres', () => {
    const result = signupRequestSchema.safeParse({ ...valid, password: '1234567' })
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error).password).toMatch(/8 caracteres/)
  })

  it('recusa campos desconhecidos', () => {
    expect(signupRequestSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false)
  })
})
