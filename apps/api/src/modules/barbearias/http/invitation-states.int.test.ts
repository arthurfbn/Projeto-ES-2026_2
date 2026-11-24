import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  barbershopResponseSchema,
  leaveConfirmationErrorSchema,
  receivedInvitationListResponseSchema,
  sentInvitationListResponseSchema,
  sentInvitationResponseSchema,
} from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock, type Clock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import { createBarbershopProfilesQuery, createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)

const invitedAt = '2026-11-21T10:00:00-03:00'

async function makeApp(clock: Clock = fixedClock(invitedAt)) {
  const identity = createIdentityModule({
    db,
    clock,
    profiles: createBarbershopProfilesQuery(db),
    authRateLimit: { max: 1000, timeWindow: '1 minute' },
  })
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    modules: [
      identity,
      createBarbershopsModule({ db, clock, requireUser: identity.requireUser, users: createUserDirectory(db) }),
    ],
  })
}

type App = Awaited<ReturnType<typeof makeApp>>

async function signUp(app: App, name: string, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name, email, phone: '11987654321', password: 'segredo123' },
  })
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
}

/** Entra de novo: com o relógio adiantado 8 dias, a sessão do cadastro (7 dias) também expirou. */
async function logIn(app: App, email: string) {
  const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'segredo123' } })
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
}

function call(app: App, token: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

async function createShop(app: App, token: string, name: string, alsoBarber = false) {
  const response = await call(app, token, 'POST', '/barbershops', {
    name,
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1578',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    alsoBarber,
  })
  return barbershopResponseSchema.parse(response.json()).barbershop.id
}

function invite(app: App, token: string, shopId: string, payload: object) {
  return call(app, token, 'POST', `/barbershops/${shopId}/invitations`, payload)
}

async function inviteId(app: App, token: string, shopId: string, payload: object) {
  return sentInvitationResponseSchema.parse((await invite(app, token, shopId, payload)).json()).invitation.id
}

const accept = (app: App, token: string, id: string, payload: object = {}) =>
  call(app, token, 'POST', `/invitations/${id}/accept`, payload)

const userId = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE invitations, allowed_shifts, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('duplicidade (R11)', () => {
  it('CA11: repetir convite pendente do mesmo tipo dá erro; de outro tipo, não', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    await signUp(app, 'Léo', 'leo@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha')
    await invite(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber' })

    const again = await invite(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber' })
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ error: 'ALREADY_INVITED', fields: { email: expect.any(String) } })

    expect((await invite(app, ze, shop, { email: 'leo@exemplo.com', kind: 'manager' })).statusCode).toBe(201)
    expect(await db.invitation.count()).toBe(2)
  })

  it('CA11: convite expirado não conta como pendente', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    await signUp(app, 'Léo', 'leo@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha')
    await invite(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber' })

    const later = await makeApp(fixedClock('2026-11-29T10:00:00-03:00'))
    const zeLater = await logIn(later, 'ze@exemplo.com')
    expect((await invite(later, zeLater, shop, { email: 'leo@exemplo.com', kind: 'barber' })).statusCode).toBe(201)
  })

  it('CA11: não convida quem já tem o perfil (gerente; barbeiro ativo) nem quem tem vínculo inativo', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha', true)

    const selfManager = await invite(app, ze, shop, { email: 'ze@exemplo.com', kind: 'manager' })
    expect(selfManager.json()).toMatchObject({ error: 'ALREADY_MANAGER' })
    const selfBarber = await invite(app, ze, shop, { email: 'ze@exemplo.com', kind: 'barber' })
    expect(selfBarber.json()).toMatchObject({ error: 'ALREADY_BARBER' })

    await db.barberMembership.updateMany({ data: { isActive: false } })
    const inactive = await invite(app, ze, shop, { email: 'ze@exemplo.com', kind: 'barber' })
    expect(inactive.statusCode).toBe(409)
    expect(inactive.json()).toMatchObject({ error: 'INACTIVE_MEMBERSHIP' })
    expect(await db.invitation.count()).toBe(0)
  })
})

describe('expiração, recusa e cancelamento (R12, R13)', () => {
  it('CA12: convite de 8 dias aparece como expirado ao aceitar, nada é criado e sai da lista', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    await signUp(app, 'Léo', 'leo@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha')
    const id = await inviteId(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber' })

    const later = await makeApp(fixedClock('2026-11-29T10:00:00-03:00'))
    const leoLater = await logIn(later, 'leo@exemplo.com')
    const listed = receivedInvitationListResponseSchema.parse((await call(later, leoLater, 'GET', '/invitations')).json())
    expect(listed.invitations).toEqual([])

    const response = await accept(later, leoLater, id)
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: 'INVITATION_EXPIRED' })
    expect(await db.barberMembership.count()).toBe(0)
    expect((await db.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('expired')
  })

  it('CA13: o convidado recusa; depois não pode mais aceitar', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    const leo = await signUp(app, 'Léo', 'leo@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha')
    const id = await inviteId(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber' })

    const declined = await call(app, leo, 'POST', `/invitations/${id}/decline`)
    expect(declined.statusCode).toBe(204)
    expect(await db.invitation.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'declined',
      respondedAt: new Date(invitedAt),
    })

    expect((await accept(app, leo, id)).json()).toMatchObject({ error: 'INVITATION_NOT_PENDING' })
    expect(await db.barberMembership.count()).toBe(0)
  })

  it('CA13: o gerente vê os pendentes e cancela; o convidado não pode mais aceitar', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    const leo = await signUp(app, 'Léo Tesoura', 'leo@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha')
    const id = await inviteId(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber', isExclusive: true })

    const list = sentInvitationListResponseSchema.parse((await call(app, ze, 'GET', `/barbershops/${shop}/invitations`)).json())
    expect(list.invitations).toEqual([
      {
        id,
        invitee: { name: 'Léo Tesoura' },
        kind: 'barber',
        isExclusive: true,
        expiresAt: new Date('2026-11-28T10:00:00-03:00').toISOString(),
      },
    ])

    const canceled = await call(app, ze, 'POST', `/barbershops/${shop}/invitations/${id}/cancel`)
    expect(canceled.statusCode).toBe(204)
    expect((await db.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('canceled')
    expect((await accept(app, leo, id)).json()).toMatchObject({ error: 'INVITATION_NOT_PENDING' })

    const after = sentInvitationListResponseSchema.parse((await call(app, ze, 'GET', `/barbershops/${shop}/invitations`)).json())
    expect(after.invitations).toEqual([])
  })

  it('só o convidado recusa e só gerente desta barbearia lista e cancela', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    await signUp(app, 'Léo', 'leo@exemplo.com')
    const other = await signUp(app, 'Outro', 'outro@exemplo.com')
    const shop = await createShop(app, ze, 'Navalha')
    const otherShop = await createShop(app, other, 'Outra')
    const id = await inviteId(app, ze, shop, { email: 'leo@exemplo.com', kind: 'barber' })

    expect((await call(app, ze, 'POST', `/invitations/${id}/decline`)).statusCode).toBe(404)
    expect((await call(app, other, 'GET', `/barbershops/${shop}/invitations`)).statusCode).toBe(403)
    expect((await call(app, other, 'POST', `/barbershops/${shop}/invitations/${id}/cancel`)).statusCode).toBe(403)
    // Gerente de outra barbearia, pela própria barbearia: o convite não é dela.
    expect((await call(app, other, 'POST', `/barbershops/${otherShop}/invitations/${id}/cancel`)).statusCode).toBe(404)
    expect((await db.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('pending')
  })
})

describe('exclusividade no aceite (R14b, R14c)', () => {
  it('CA9b: com vínculo exclusivo ativo na A, não aceita convite de barbeiro da B', async () => {
    const app = await makeApp()
    const ana = await signUp(app, 'Ana', 'ana@exemplo.com')
    const bia = await signUp(app, 'Bia', 'bia@exemplo.com')
    const leo = await signUp(app, 'Léo', 'leo@exemplo.com')
    const a = await createShop(app, ana, 'A')
    const b = await createShop(app, bia, 'B')
    await accept(app, leo, await inviteId(app, ana, a, { email: 'leo@exemplo.com', kind: 'barber', isExclusive: true }))

    const response = await accept(app, leo, await inviteId(app, bia, b, { email: 'leo@exemplo.com', kind: 'barber' }))

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE' })
    expect(await db.barberMembership.count({ where: { barbershopId: b } })).toBe(0)
  })

  it('CA9c: com vínculos na A e na B, aceitar exclusivo da C pede confirmação; sem confirmar nada muda', async () => {
    const app = await makeApp()
    const ana = await signUp(app, 'Ana', 'ana@exemplo.com')
    const bia = await signUp(app, 'Bia', 'bia@exemplo.com')
    const cid = await signUp(app, 'Cid', 'cid@exemplo.com')
    const leo = await signUp(app, 'Léo', 'leo@exemplo.com')
    const a = await createShop(app, ana, 'A')
    const b = await createShop(app, bia, 'B')
    const c = await createShop(app, cid, 'C')
    await accept(app, leo, await inviteId(app, ana, a, { email: 'leo@exemplo.com', kind: 'barber' }))
    await accept(app, leo, await inviteId(app, bia, b, { email: 'leo@exemplo.com', kind: 'barber' }))
    const id = await inviteId(app, cid, c, { email: 'leo@exemplo.com', kind: 'barber', isExclusive: true })

    const unconfirmed = await accept(app, leo, id)

    expect(unconfirmed.statusCode).toBe(409)
    expect(leaveConfirmationErrorSchema.parse(unconfirmed.json()).barbershops).toEqual([
      { id: a, name: 'A' },
      { id: b, name: 'B' },
    ])
    expect((await db.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('pending')
    expect(await db.barberMembership.count({ where: { isActive: true } })).toBe(2)

    const confirmed = await accept(app, leo, id, { confirmLeave: true })

    expect(confirmed.statusCode).toBe(200)
    const active = await db.barberMembership.findMany({ where: { userId: await userId('leo@exemplo.com'), isActive: true } })
    expect(active.map((membership) => membership.barbershopId)).toEqual([c])
    expect(active[0]?.isExclusive).toBe(true)
  })
})
