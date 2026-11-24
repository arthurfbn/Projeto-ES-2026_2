import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  barbershopResponseSchema,
  meResponseSchema,
  ownMembershipResponseSchema,
  sentInvitationResponseSchema,
} from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import { createBarbershopProfilesQuery, createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)
const now = '2026-11-23T10:00:00-03:00'
const clock = fixedClock(now)

async function makeApp() {
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

function call(app: App, token: string, method: 'GET' | 'POST', url: string, payload?: unknown) {
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

/** Vínculo pelo fluxo real: gerente convida, barbeiro aceita. */
async function hire(app: App, managerToken: string, shopId: string, barberToken: string, email: string) {
  const sent = await call(app, managerToken, 'POST', `/barbershops/${shopId}/invitations`, {
    email,
    kind: 'barber',
    isExclusive: true,
  })
  const { invitation } = sentInvitationResponseSchema.parse(sent.json())
  await call(app, barberToken, 'POST', `/invitations/${invitation.id}/accept`)
}

async function me(app: App, token: string) {
  return meResponseSchema.parse((await call(app, token, 'GET', '/me')).json())
}

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE invitations, allowed_shifts, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('GET /me: o que o Início mostra (R5, R6; ADR-0022)', () => {
  it('CA4: gerente de A e barbeiro de B vê A em Minhas barbearias e B em Meus vínculos', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')
    const maria = await signUp(app, 'Maria Tesoura', 'maria@exemplo.com')
    const navalha = await createShop(app, ze, 'Navalha')
    const capital = await createShop(app, maria, 'Capital')
    await hire(app, maria, capital, ze, 'ze@exemplo.com')

    const body = await me(app, ze)

    expect(body.managedBarbershops).toEqual([{ id: navalha, name: 'Navalha' }])
    expect(body.memberships).toEqual([
      { id: expect.any(String), barbershopId: capital, barbershopName: 'Capital' },
    ])
  })

  it('gerente que também atende aparece nas duas listas', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')
    const shop = await createShop(app, ze, 'Barbearia do Zé', true)

    const body = await me(app, ze)

    expect(body.managedBarbershops).toEqual([{ id: shop, name: 'Barbearia do Zé' }])
    expect(body.memberships).toMatchObject([{ barbershopId: shop, barbershopName: 'Barbearia do Zé' }])
  })

  it('vínculo inativo não aparece em Meus vínculos', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')
    const maria = await signUp(app, 'Maria Tesoura', 'maria@exemplo.com')
    const shop = await createShop(app, maria, 'Capital')
    await hire(app, maria, shop, ze, 'ze@exemplo.com')
    await db.barberMembership.updateMany({ data: { isActive: false } })

    expect((await me(app, ze)).memberships).toEqual([])
  })

  it('cadastro e login já devolvem as listas', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')
    await createShop(app, ze, 'Navalha')

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ze@exemplo.com', password: 'segredo123' },
    })
    const body = meResponseSchema.parse(login.json())
    expect(body.managedBarbershops).toHaveLength(1)
    expect(body.memberships).toEqual([])
  })
})

describe('GET /memberships/:membershipId: página do vínculo (ADR-0022)', () => {
  it('CA4: o barbeiro vê contratação, quem aprovou, exclusividade, situação e turno', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')
    const maria = await signUp(app, 'Maria Tesoura', 'maria@exemplo.com')
    const shop = await createShop(app, maria, 'Capital')
    await hire(app, maria, shop, ze, 'ze@exemplo.com')
    const [summary] = (await me(app, ze)).memberships
    await db.allowedShift.create({
      data: { membershipId: summary?.id ?? '', weekday: 1, startMinute: 540, endMinute: 1080 },
    })

    const response = await call(app, ze, 'GET', `/memberships/${summary?.id}`)

    expect(response.statusCode).toBe(200)
    expect(ownMembershipResponseSchema.parse(response.json()).membership).toMatchObject({
      id: summary?.id,
      barbershop: { id: shop, name: 'Capital', city: 'São Paulo', state: 'SP' },
      hiredAt: new Date(now).toISOString(),
      approvedBy: { name: 'Maria Tesoura' },
      isExclusive: true,
      acceptsAppointments: true,
      isActive: true,
      shift: [{ weekday: 1, startMinute: 540, endMinute: 1080 }],
    })
  })

  it('só o próprio barbeiro vê: para os outros, inclusive o gerente, o vínculo não existe (404)', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')
    const maria = await signUp(app, 'Maria Tesoura', 'maria@exemplo.com')
    const intruder = await signUp(app, 'Intruso', 'intruso@exemplo.com')
    const shop = await createShop(app, maria, 'Capital')
    await hire(app, maria, shop, ze, 'ze@exemplo.com')
    const [summary] = (await me(app, ze)).memberships

    for (const token of [maria, intruder]) {
      const response = await call(app, token, 'GET', `/memberships/${summary?.id}`)
      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ error: 'MEMBERSHIP_NOT_FOUND' })
    }
  })

  it('sem sessão responde 401; id malformado responde 404', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'Zé Navalha', 'ze@exemplo.com')

    expect((await call(app, 'token-inventado', 'GET', '/memberships/x')).statusCode).toBe(401)
    expect((await call(app, ze, 'GET', '/memberships/nao-e-uuid')).statusCode).toBe(404)
  })
})
