import { describe, expect, it } from 'vitest'
import {
  planInvitation,
  planInvitationAcceptance,
  planInvitationClosing,
  type InviteeSituation,
  type InvitationRecord,
  type OtherMembership,
} from './invitation'

const barbershopId = '33333333-3333-4333-8333-333333333333'
const managerId = '11111111-1111-4111-8111-111111111111'
const inviteeId = '22222222-2222-4222-8222-222222222222'
const createdAt = new Date('2026-11-21T10:00:00-03:00')
const acceptedAt = new Date('2026-11-23T15:30:00-03:00')

const newcomer: InviteeSituation = { isManager: false, membership: null, pendingKinds: [] }

const invite = (overrides: { situation?: InviteeSituation | null; kind?: 'barber' | 'manager'; isExclusive?: boolean }) =>
  planInvitation({
    barbershopId,
    invitedByUserId: managerId,
    invitee: overrides.situation === null ? null : { id: inviteeId, situation: overrides.situation ?? newcomer },
    kind: overrides.kind ?? 'barber',
    isExclusive: overrides.isExclusive ?? false,
    now: createdAt,
  })

describe('planInvitation (R10, R11)', () => {
  it('convite de barbeiro para usuário cadastrado: pendente, com a exclusividade proposta e validade de 7 dias', () => {
    expect(invite({ isExclusive: true })).toEqual({
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
    const result = invite({ kind: 'manager', isExclusive: true })

    expect(result.ok && result.value.isExclusive).toBe(false)
  })

  it('CA10: e-mail sem conta não gera convite', () => {
    expect(invite({ situation: null })).toEqual({ ok: false, error: 'USER_NOT_FOUND' })
  })

  it('CA11: não repete convite pendente do mesmo tipo', () => {
    expect(invite({ situation: { ...newcomer, pendingKinds: ['barber'] } })).toEqual({
      ok: false,
      error: 'ALREADY_INVITED',
    })
  })

  it('convite pendente de outro tipo não impede (barbeiro e gerente são perfis diferentes)', () => {
    expect(invite({ kind: 'manager', situation: { ...newcomer, pendingKinds: ['barber'] } }).ok).toBe(true)
  })

  it('CA11: não convida para gerente quem já é gerente', () => {
    expect(invite({ kind: 'manager', situation: { ...newcomer, isManager: true } })).toEqual({
      ok: false,
      error: 'ALREADY_MANAGER',
    })
  })

  it('CA11: não convida para barbeiro quem já tem vínculo ativo', () => {
    expect(invite({ situation: { ...newcomer, membership: 'active' } })).toEqual({ ok: false, error: 'ALREADY_BARBER' })
  })

  it('R11: quem tem vínculo inativo aqui não recebe convite de barbeiro (o gerente reativa)', () => {
    expect(invite({ situation: { ...newcomer, membership: 'inactive' } })).toEqual({
      ok: false,
      error: 'INACTIVE_MEMBERSHIP',
    })
  })

  it('gerente sem vínculo pode ser convidado para barbeiro da própria casa, e barbeiro para gerente', () => {
    expect(invite({ situation: { ...newcomer, isManager: true } }).ok).toBe(true)
    expect(invite({ kind: 'manager', situation: { ...newcomer, membership: 'active' } }).ok).toBe(true)
  })
})

const pending = (overrides: Partial<InvitationRecord> = {}): InvitationRecord => ({
  id: '44444444-4444-4444-8444-444444444444',
  barbershopId,
  invitedByUserId: managerId,
  inviteeUserId: inviteeId,
  kind: 'barber',
  isExclusive: false,
  status: 'pending',
  expiresAt: new Date('2026-11-28T10:00:00-03:00'),
  ...overrides,
})

const elsewhere = (overrides: Partial<OtherMembership> = {}): OtherMembership => ({
  id: '55555555-5555-4555-8555-555555555555',
  barbershopId: '66666666-6666-4666-8666-666666666666',
  barbershopName: 'Barbearia A',
  isExclusive: false,
  ...overrides,
})

const accept = (input: {
  invitation?: InvitationRecord
  userId?: string
  now?: Date
  otherMemberships?: OtherMembership[]
  confirmLeave?: boolean
}) =>
  planInvitationAcceptance({
    invitation: input.invitation ?? pending(),
    userId: input.userId ?? inviteeId,
    now: input.now ?? acceptedAt,
    otherMemberships: input.otherMemberships ?? [],
    confirmLeave: input.confirmLeave ?? false,
  })

describe('planInvitationAcceptance (R12, R13, R14, R14b, R14c)', () => {
  it('CA9: aceitar convite de barbeiro cria vínculo contratado no aceite e aprovado por quem convidou', () => {
    expect(accept({})).toEqual({
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
        deactivateMembershipIds: [],
      },
    })
  })

  it('o vínculo herda a exclusividade proposta no convite', () => {
    const result = accept({ invitation: pending({ isExclusive: true }) })

    expect(result.ok && result.value.grant.kind === 'barber' && result.value.grant.membership.isExclusive).toBe(true)
  })

  it('aceitar convite de gerente cria a gerência', () => {
    expect(accept({ invitation: pending({ kind: 'manager' }) })).toEqual({
      ok: true,
      value: {
        invitationId: pending().id,
        acceptedAt,
        grant: { kind: 'manager', barbershopId, managerUserId: inviteeId },
        deactivateMembershipIds: [],
      },
    })
  })

  it('só o convidado aceita: para outro usuário o convite "não existe"', () => {
    expect(accept({ userId: managerId })).toEqual({ ok: false, error: 'INVITATION_NOT_FOUND' })
  })

  it('convite que não está pendente não pode ser aceito', () => {
    expect(accept({ invitation: pending({ status: 'declined' }) })).toEqual({
      ok: false,
      error: 'INVITATION_NOT_PENDING',
    })
  })

  it('CA12: convite criado há 8 dias está expirado e nada é criado', () => {
    expect(accept({ now: new Date('2026-11-29T10:00:00-03:00') })).toEqual({ ok: false, error: 'INVITATION_EXPIRED' })
  })

  it('R12: expira exatamente 7 dias depois de criado', () => {
    expect(accept({ now: new Date('2026-11-28T09:59:59-03:00') }).ok).toBe(true)
    expect(accept({ now: new Date('2026-11-28T10:00:00-03:00') })).toEqual({ ok: false, error: 'INVITATION_EXPIRED' })
  })

  it('não exclusivo com vínculos em outras barbearias: aceita e mantém os outros', () => {
    const result = accept({ otherMemberships: [elsewhere()] })

    expect(result.ok && result.value.deactivateMembershipIds).toEqual([])
  })

  it('CA9b: com vínculo exclusivo ativo em outra barbearia, não aceita convite de barbeiro', () => {
    expect(accept({ otherMemberships: [elsewhere({ isExclusive: true })] })).toEqual({
      ok: false,
      error: 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE',
    })
  })

  it('CA9b: vale mesmo confirmando a saída e mesmo sendo convite exclusivo', () => {
    expect(
      accept({
        invitation: pending({ isExclusive: true }),
        otherMemberships: [elsewhere({ isExclusive: true })],
        confirmLeave: true,
      }),
    ).toEqual({ ok: false, error: 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE' })
  })

  it('vínculo exclusivo em outra barbearia não impede aceitar convite de gerente', () => {
    expect(accept({ invitation: pending({ kind: 'manager' }), otherMemberships: [elsewhere({ isExclusive: true })] }).ok).toBe(
      true,
    )
  })

  it('CA9c: convite exclusivo com vínculos em outras barbearias pede confirmação da saída', () => {
    expect(accept({ invitation: pending({ isExclusive: true }), otherMemberships: [elsewhere()] })).toEqual({
      ok: false,
      error: 'LEAVE_CONFIRMATION_REQUIRED',
    })
  })

  it('CA9c: confirmando a saída, os outros vínculos são desativados no aceite', () => {
    const a = elsewhere()
    const b = elsewhere({ id: '77777777-7777-4777-8777-777777777777', barbershopName: 'Barbearia B' })

    const result = accept({ invitation: pending({ isExclusive: true }), otherMemberships: [a, b], confirmLeave: true })

    expect(result.ok && result.value.deactivateMembershipIds).toEqual([a.id, b.id])
  })
})

describe('planInvitationClosing (R13)', () => {
  const now = acceptedAt

  it('CA13: o convidado recusa um convite pendente', () => {
    expect(planInvitationClosing({ invitation: pending(), as: 'invitee', userId: inviteeId, now })).toEqual({
      ok: true,
      value: { invitationId: pending().id, status: 'declined', respondedAt: now },
    })
  })

  it('CA13: o gerente cancela um convite pendente', () => {
    expect(planInvitationClosing({ invitation: pending(), as: 'manager', userId: managerId, now })).toEqual({
      ok: true,
      value: { invitationId: pending().id, status: 'canceled', respondedAt: now },
    })
  })

  it('só o convidado recusa: para outro usuário o convite "não existe"', () => {
    expect(planInvitationClosing({ invitation: pending(), as: 'invitee', userId: managerId, now })).toEqual({
      ok: false,
      error: 'INVITATION_NOT_FOUND',
    })
  })

  it('CA13: convite já recusado ou cancelado não muda mais de estado', () => {
    for (const status of ['declined', 'canceled', 'accepted'] as const) {
      expect(planInvitationClosing({ invitation: pending({ status }), as: 'manager', userId: managerId, now })).toEqual({
        ok: false,
        error: 'INVITATION_NOT_PENDING',
      })
    }
  })

  it('convite expirado não é recusado nem cancelado', () => {
    const late = new Date('2026-11-29T10:00:00-03:00')

    expect(planInvitationClosing({ invitation: pending(), as: 'invitee', userId: inviteeId, now: late })).toEqual({
      ok: false,
      error: 'INVITATION_EXPIRED',
    })
  })
})
