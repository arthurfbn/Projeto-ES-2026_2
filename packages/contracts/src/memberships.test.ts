import { describe, expect, it } from 'vitest'
import { fieldErrors } from './auth'
import { updateMembershipRequestSchema, updateShiftRequestSchema } from './memberships'

const segunda9as18 = { weekday: 1, startMinute: 540, endMinute: 1080 }

function errorsOf(input: unknown) {
  const result = updateShiftRequestSchema.safeParse(input)
  return result.success ? {} : fieldErrors(result.error)
}

describe('updateShiftRequestSchema (R15)', () => {
  it('CA14: aceita janelas semanais', () => {
    expect(updateShiftRequestSchema.parse({ windows: [segunda9as18] })).toEqual({ windows: [segunda9as18] })
  })

  it('aceita lista vazia (remove o turno)', () => {
    expect(updateShiftRequestSchema.parse({ windows: [] })).toEqual({ windows: [] })
  })

  it.each([
    ['início depois do fim', { ...segunda9as18, startMinute: 1080, endMinute: 540 }],
    ['fora do passo de 15 min', { ...segunda9as18, startMinute: 550 }],
    ['dia inexistente', { ...segunda9as18, weekday: 7 }],
    ['depois da meia-noite', { ...segunda9as18, endMinute: 1455 }],
  ])('recusa janela com %s, com erro em windows', (_caso, window) => {
    expect(errorsOf({ windows: [window] })).toEqual({
      windows: 'Confira os horários: início antes do fim, de 15 em 15 minutos.',
    })
  })

  it('rejeita campos desconhecidos', () => {
    expect(updateShiftRequestSchema.safeParse({ windows: [], barbershopId: 'x' }).success).toBe(false)
  })
})

describe('updateMembershipRequestSchema (R15)', () => {
  it('aceita alterar se aceita agendamentos e se está ativo', () => {
    expect(updateMembershipRequestSchema.parse({ acceptsAppointments: false })).toEqual({ acceptsAppointments: false })
    expect(updateMembershipRequestSchema.parse({ isActive: true })).toEqual({ isActive: true })
  })

  it('recusa pedido vazio e campos que o gerente não altera aqui', () => {
    expect(updateMembershipRequestSchema.safeParse({}).success).toBe(false)
    expect(updateMembershipRequestSchema.safeParse({ isExclusive: false }).success).toBe(false)
  })
})
