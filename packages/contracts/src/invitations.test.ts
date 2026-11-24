import { describe, expect, it } from 'vitest'
import { acceptInvitationRequestSchema, createInvitationRequestSchema } from './invitations'

describe('createInvitationRequestSchema (R10)', () => {
  it('normaliza o e-mail e assume convite não exclusivo', () => {
    const parsed = createInvitationRequestSchema.parse({ email: '  Barbeiro@Exemplo.COM ', kind: 'barber' })

    expect(parsed).toEqual({ email: 'barbeiro@exemplo.com', kind: 'barber', isExclusive: false })
  })

  it('aceita só barbeiro ou gerente', () => {
    const parsed = createInvitationRequestSchema.safeParse({ email: 'a@exemplo.com', kind: 'diaria' })

    expect(parsed.success).toBe(false)
  })

  it('recusa e-mail inválido e campos desconhecidos', () => {
    expect(createInvitationRequestSchema.safeParse({ email: 'nao-e-email', kind: 'barber' }).success).toBe(false)
    expect(
      createInvitationRequestSchema.safeParse({ email: 'a@exemplo.com', kind: 'barber', barbershopId: 'x' }).success,
    ).toBe(false)
  })
})

describe('acceptInvitationRequestSchema (R14c)', () => {
  it('corpo vazio não confirma a saída', () => {
    expect(acceptInvitationRequestSchema.parse({})).toEqual({ confirmLeave: false })
  })

  it('recusa campos desconhecidos', () => {
    expect(acceptInvitationRequestSchema.safeParse({ confirmLeave: true, userId: 'x' }).success).toBe(false)
  })
})
