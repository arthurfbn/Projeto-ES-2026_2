import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  acceptInvitationResponseSchema,
  barbershopResponseSchema,
  receivedInvitationListResponseSchema,
  sentInvitationResponseSchema,
} from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock, type Clock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import { createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)

const invitedAt = '2026-11-21T10:00:00-03:00'
const acceptedAt = '2026-11-23T15:30:00-03:00'

/** O relógio muda entre o convite e o aceite; cada etapa monta o app com o seu. */
async function makeApp(clock: Clock = fixedClock(invitedAt)) {
  const identity = createIdentityModule({ db, clock, authRateLimit: { max: 1000, timeWindow: '1 minute' } })
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

async function signUp(app: App, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name: 'Zé Navalha', email, phone: '11987654321', password: 'segredo123' },
  })
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
}

async function createShop(app: App, token: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/barbershops',
    cookies: { [SESSION_COOKIE]: token },
    payload: {
      name: 'Barbearia do Zé',
      cep: '01310100',
      street: 'Avenida Paulista',
      number: '1578',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
  })
  return barbershopResponseSchema.parse(response.json()).barbershop.id
}

function call(app: App, token: string, method: 'GET' | 'POST', url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

async function invite(app: App, token: string, shopId: string, payload: unknown) {
  return call(app, token, 'POST', `/barbershops/${shopId}/invitations`, payload)
}

const userId = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('convite de barbeiro e aceite (R10, R14)', () => {
  it('CA9: convidado aceita e o vínculo nasce com contratação = aceite e aprovado por = quem convidou', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    const barberToken = await signUp(app, 'barbeiro@exemplo.com')

    // E-mail em outra caixa: a busca é sem diferenciar maiúsculas (R1).
    const sent = await invite(app, managerToken, shopId, { email: 'Barbeiro@Exemplo.com', kind: 'barber' })
    expect(sent.statusCode).toBe(201)
    expect(sentInvitationResponseSchema.parse(sent.json()).invitation).toMatchObject({
      kind: 'barber',
      isExclusive: false,
      status: 'pending',
      expiresAt: new Date('2026-11-28T10:00:00-03:00').toISOString(),
    })

    const later = await makeApp(fixedClock(acceptedAt))
    const received = receivedInvitationListResponseSchema.parse((await call(later, barberToken, 'GET', '/invitations')).json())
    expect(received.invitations).toHaveLength(1)
    expect(received.invitations[0]).toMatchObject({ barbershopId: shopId, barbershopName: 'Barbearia do Zé', kind: 'barber' })

    const accepted = await call(later, barberToken, 'POST', `/invitations/${received.invitations[0]?.id}/accept`)
    expect(accepted.statusCode).toBe(200)
    expect(acceptInvitationResponseSchema.parse(accepted.json())).toEqual({ barbershopId: shopId, kind: 'barber' })

    const membership = await db.barberMembership.findFirstOrThrow({ where: { barbershopId: shopId } })
    expect(membership).toMatchObject({
      userId: await userId('barbeiro@exemplo.com'),
      approvedByUserId: await userId('ze@exemplo.com'),
      hiredAt: new Date(acceptedAt),
      isExclusive: false,
      acceptsAppointments: true,
      isActive: true,
    })

    // Aceito sai da lista de pendentes, e a barbearia passa a aparecer para o barbeiro.
    const after = receivedInvitationListResponseSchema.parse((await call(later, barberToken, 'GET', '/invitations')).json())
    expect(after.invitations).toEqual([])
    const shop = barbershopResponseSchema.parse((await call(later, barberToken, 'GET', `/barbershops/${shopId}`)).json())
    expect(shop.roles).toEqual({ manager: false, barber: true })
  })

  it('convite exclusivo: o vínculo herda a exclusividade', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    const barberToken = await signUp(app, 'barbeiro@exemplo.com')

    const sent = await invite(app, managerToken, shopId, { email: 'barbeiro@exemplo.com', kind: 'barber', isExclusive: true })
    const { invitation } = sentInvitationResponseSchema.parse(sent.json())
    expect(invitation.isExclusive).toBe(true)

    await call(app, barberToken, 'POST', `/invitations/${invitation.id}/accept`)

    const membership = await db.barberMembership.findFirstOrThrow({ where: { barbershopId: shopId } })
    expect(membership.isExclusive).toBe(true)
  })

  it('aceitar convite de gerente cria a gerência (e nenhum vínculo)', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    const newManagerToken = await signUp(app, 'gerente@exemplo.com')

    const sent = await invite(app, managerToken, shopId, { email: 'gerente@exemplo.com', kind: 'manager', isExclusive: true })
    const { invitation } = sentInvitationResponseSchema.parse(sent.json())
    expect(invitation.isExclusive).toBe(false)

    const accepted = await call(app, newManagerToken, 'POST', `/invitations/${invitation.id}/accept`)
    expect(acceptInvitationResponseSchema.parse(accepted.json())).toEqual({ barbershopId: shopId, kind: 'manager' })

    const shop = barbershopResponseSchema.parse((await call(app, newManagerToken, 'GET', `/barbershops/${shopId}`)).json())
    expect(shop.roles).toEqual({ manager: true, barber: false })
    expect(await db.barberMembership.count()).toBe(0)
  })

  it('CA10: e-mail sem conta responde "usuário não encontrado" e não cria convite', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)

    const response = await invite(app, managerToken, shopId, { email: 'ninguem@exemplo.com', kind: 'barber' })

    expect(response.statusCode).toBe(422)
    expect(response.json()).toMatchObject({ error: 'USER_NOT_FOUND', fields: { email: expect.stringContaining('não encontrado') } })
    expect(await db.invitation.count()).toBe(0)
  })

  it('convite aceito não pode ser aceito de novo', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    const barberToken = await signUp(app, 'barbeiro@exemplo.com')
    const { invitation } = sentInvitationResponseSchema.parse(
      (await invite(app, managerToken, shopId, { email: 'barbeiro@exemplo.com', kind: 'barber' })).json(),
    )
    await call(app, barberToken, 'POST', `/invitations/${invitation.id}/accept`)

    const again = await call(app, barberToken, 'POST', `/invitations/${invitation.id}/accept`)

    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ error: 'INVITATION_NOT_PENDING' })
    expect(await db.barberMembership.count()).toBe(1)
  })
})

describe('autorização dos convites', () => {
  it('quem não é gerente da barbearia não convida (403), mesmo sendo gerente de outra', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    const otherToken = await signUp(app, 'outro@exemplo.com')
    await createShop(app, otherToken)

    const response = await invite(app, otherToken, shopId, { email: 'outro@exemplo.com', kind: 'manager' })

    expect(response.statusCode).toBe(403)
    expect(await db.invitation.count()).toBe(0)
  })

  it('só o convidado vê e aceita: para os outros o convite não existe (404)', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    await signUp(app, 'barbeiro@exemplo.com')
    const intruderToken = await signUp(app, 'intruso@exemplo.com')
    const { invitation } = sentInvitationResponseSchema.parse(
      (await invite(app, managerToken, shopId, { email: 'barbeiro@exemplo.com', kind: 'barber' })).json(),
    )

    const list = receivedInvitationListResponseSchema.parse((await call(app, intruderToken, 'GET', '/invitations')).json())
    expect(list.invitations).toEqual([])

    for (const token of [intruderToken, managerToken]) {
      const response = await call(app, token, 'POST', `/invitations/${invitation.id}/accept`)
      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ error: 'INVITATION_NOT_FOUND' })
    }
    expect(await db.barberMembership.count()).toBe(0)
    expect((await db.invitation.findUniqueOrThrow({ where: { id: invitation.id } })).status).toBe('pending')
  })

  it('sem sessão responde 401; convite com id malformado responde 404', async () => {
    const app = await makeApp()
    const token = await signUp(app, 'ze@exemplo.com')

    expect((await call(app, 'token-inventado', 'GET', '/invitations')).statusCode).toBe(401)
    expect((await call(app, 'token-inventado', 'POST', '/invitations/x/accept')).statusCode).toBe(401)
    expect((await call(app, token, 'POST', '/invitations/nao-e-uuid/accept')).statusCode).toBe(404)
  })
})
