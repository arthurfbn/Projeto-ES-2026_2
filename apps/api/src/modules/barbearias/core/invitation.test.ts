import { describe, expect, it } from 'vitest'
import { planInvitation, planInvitationAcceptance, type PendingInvitation } from './invitation'

const barbershopId = '33333333-3333-4333-8333-333333333333'
const managerId = '11111111-1111-4111-8111-111111111111'
const inviteeId = '22222222-2222-4222-8222-222222222222'
const createdAt = new Date('2026-11-21T10:00:00-03:00')
const acceptedAt = new Date('2026-11-23T15:30:00-03:00')

describe('planInvitation (R10)', () => {
  it('convite de barbeiro para usuário cadastrado: pendente, com a exclusividade proposta e validade de 7 dias', () => {
    const result = planInvitation({
      barbershopId,
      invitedByUserId: managerId,
      invitee: { id: inviteeId },
      kind: 'barber',
      isExclusive: true,
      now: createdAt,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        barbershopId,
        invitedByUserId: managerId,
        inviteeUserId: inviteeId,
        kind: 'barber',
        isExclusive: true,
        expiresAt: new Date('2026-11-28T10:00:00-03:00'),
      },
    })
  })

  it('convite de gerente nunca é exclusivo (exclusividade é só do vínculo de barbeiro)', () => {
    const result = planInvitation({
      barbershopId,
      invitedByUserId: managerId,
      invitee: { id: inviteeId },
      kind: 'manager',
      isExclusive: true,
      now: createdAt,
    })

    expect(result.ok && result.value.isExclusive).toBe(false)
  })

  it('CA10: e-mail sem conta não gera convite', () => {
    const result = planInvitation({
      barbershopId,
      invitedByUserId: managerId,
      invitee: null,
      kind: 'barber',
      isExclusive: false,
      now: createdAt,
    })

    expect(result).toEqual({ ok: false, error: 'USER_NOT_FOUND' })
  })
})

const pending = (overrides: Partial<PendingInvitation> = {}): PendingInvitation => ({
  id: '44444444-4444-4444-8444-444444444444',
  barbershopId,
  invitedByUserId: managerId,
  inviteeUserId: inviteeId,
  kind: 'barber',
  isExclusive: false,
  status: 'pending',
  ...overrides,
})

describe('planInvitationAcceptance (R13, R14)', () => {
  it('CA9: aceitar convite de barbeiro cria vínculo contratado no aceite e aprovado por quem convidou', () => {
    const result = planInvitationAcceptance({ invitation: pending(), userId: inviteeId, now: acceptedAt })

    expect(result).toEqual({
      ok: true,
      value: {
        invitationId: pending().id,
        acceptedAt,
        grant: {
          kind: 'barber',
          barbershopId,
          membership: {
            barberUserId: inviteeId,
            hiredAt: acceptedAt,
            approvedByUserId: managerId,
            isExclusive: false,
            acceptsAppointments: true,
            isActive: true,
          },
        },
      },
    })
  })

  it('o vínculo herda a exclusividade proposta no convite', () => {
    const result = planInvitationAcceptance({
      invitation: pending({ isExclusive: true }),
      userId: inviteeId,
      now: acceptedAt,
    })

    expect(result.ok && result.value.grant.kind === 'barber' && result.value.grant.membership.isExclusive).toBe(true)
  })

  it('aceitar convite de gerente cria a gerência', () => {
    const result = planInvitationAcceptance({
      invitation: pending({ kind: 'manager' }),
      userId: inviteeId,
      now: acceptedAt,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        invitationId: pending().id,
        acceptedAt,
        grant: { kind: 'manager', barbershopId, managerUserId: inviteeId },
      },
    })
  })

  it('só o convidado aceita: para outro usuário o convite "não existe"', () => {
    const result = planInvitationAcceptance({ invitation: pending(), userId: managerId, now: acceptedAt })

    expect(result).toEqual({ ok: false, error: 'INVITATION_NOT_FOUND' })
  })

  it('convite que não está pendente não pode ser aceito', () => {
    const result = planInvitationAcceptance({
      invitation: pending({ status: 'accepted' }),
      userId: inviteeId,
      now: acceptedAt,
    })

    expect(result).toEqual({ ok: false, error: 'INVITATION_NOT_PENDING' })
  })
})
