import { describe, expect, it } from 'vitest'
import { createAppointmentRequestSchema } from './appointments'

const valid = {
  serviceId: '2d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
  startsAt: '2026-11-30T13:00:00.000Z',
  paymentMethod: 'on_site',
}

describe('createAppointmentRequestSchema (R9, R10)', () => {
  it('aceita "qualquer barbeiro" (sem vínculo) ou um barbeiro escolhido', () => {
    expect(createAppointmentRequestSchema.parse(valid)).toEqual(valid)
    const membershipId = '3e9f0a1b-2c3d-4e4f-9a5b-6c7d8e9f0a1b'
    expect(createAppointmentRequestSchema.parse({ ...valid, membershipId }).membershipId).toBe(membershipId)
  })

  it('aceita horário com offset de São Paulo', () => {
    expect(createAppointmentRequestSchema.safeParse({ ...valid, startsAt: '2026-11-30T10:00:00-03:00' }).success).toBe(true)
  })

  it.each([
    ['pagamento online, que ainda não existe nesta fatia', { paymentMethod: 'online' }],
    ['horário sem data e hora', { startsAt: '10:00' }],
    ['serviço que não é id', { serviceId: 'corte' }],
    ['campo desconhecido', { priceCents: 1 }],
  ])('recusa %s', (_caso, change) => {
    expect(createAppointmentRequestSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})
