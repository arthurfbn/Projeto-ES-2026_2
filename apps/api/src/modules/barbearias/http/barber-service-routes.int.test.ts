import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  barberServiceListResponseSchema,
  barberServiceResponseSchema,
  barbershopResponseSchema,
  membershipListResponseSchema,
  serviceResponseSchema,
} from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import { createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)
const clock = fixedClock('2026-11-23T10:00:00-03:00')

async function makeApp() {
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

function call(app: App, token: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

/** Gerente que também atende, com o serviço "Corte" padrão R$ 40 / 30 min. */
async function shopWithCorte(app: App, email = 'ze@exemplo.com') {
  const token = await signUp(app, email)
  const created = await call(app, token, 'POST', '/barbershops', {
    name: 'Barbearia do Zé',
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1578',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    alsoBarber: true,
  })
  const shopId = barbershopResponseSchema.parse(created.json()).barbershop.id
  const corte = serviceResponseSchema.parse(
    (await call(app, token, 'POST', `/barbershops/${shopId}/services`, { name: 'Corte', priceCents: 4000, durationMinutes: 30 })).json(),
  ).service
  const memberships = membershipListResponseSchema.parse(
    (await call(app, token, 'GET', `/barbershops/${shopId}/memberships`)).json(),
  ).memberships
  const membershipId = memberships[0]?.id ?? ''
  return { token, shopId, corte, url: `/barbershops/${shopId}/memberships/${membershipId}/services` }
}

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE barber_services, allowed_shifts, invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('serviços do barbeiro (R16)', () => {
  it('CA15: com R$ 50 próprio, o serviço do barbeiro mostra R$ 50 e 30 min', async () => {
    const app = await makeApp()
    const { token, corte, url } = await shopWithCorte(app)

    const response = await call(app, token, 'PUT', `${url}/${corte.id}`, { priceCents: 5000 })

    expect(response.statusCode).toBe(200)
    const expected = {
      serviceId: corte.id,
      name: 'Corte',
      serviceIsActive: true,
      priceCents: 5000,
      durationMinutes: null,
      effectivePriceCents: 5000,
      effectiveDurationMinutes: 30,
    }
    expect(barberServiceResponseSchema.parse(response.json()).service).toEqual(expected)
    expect(barberServiceListResponseSchema.parse((await call(app, token, 'GET', url)).json()).services).toEqual([expected])
  })

  it('sem valores próprios vale o padrão; atribuir de novo altera em vez de duplicar', async () => {
    const app = await makeApp()
    const { token, corte, url } = await shopWithCorte(app)

    const plain = await call(app, token, 'PUT', `${url}/${corte.id}`, {})
    expect(barberServiceResponseSchema.parse(plain.json()).service).toMatchObject({
      priceCents: null,
      effectivePriceCents: 4000,
      effectiveDurationMinutes: 30,
    })

    await call(app, token, 'PUT', `${url}/${corte.id}`, { durationMinutes: 45 })
    const list = barberServiceListResponseSchema.parse((await call(app, token, 'GET', url)).json()).services
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ durationMinutes: 45, effectiveDurationMinutes: 45 })
  })

  it('duração própria de 20 min dá erro e nada é gravado', async () => {
    const app = await makeApp()
    const { token, corte, url } = await shopWithCorte(app)

    const response = await call(app, token, 'PUT', `${url}/${corte.id}`, { durationMinutes: 20 })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ fields: { durationMinutes: expect.any(String) } })
    expect(await db.barberService.count()).toBe(0)
  })

  it('serviço desativado não pode ser atribuído a barbeiro', async () => {
    const app = await makeApp()
    const { token, shopId, corte, url } = await shopWithCorte(app)
    await call(app, token, 'PATCH', `/barbershops/${shopId}/services/${corte.id}`, { isActive: false })

    const response = await call(app, token, 'PUT', `${url}/${corte.id}`, {})

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({
      error: 'SERVICE_INACTIVE',
      message: 'Serviço desativado não pode ser atribuído a barbeiro.',
    })
    expect(await db.barberService.count()).toBe(0)
  })

  it('serviço desativado depois de atribuído continua listado, marcado como inativo', async () => {
    const app = await makeApp()
    const { token, shopId, corte, url } = await shopWithCorte(app)
    await call(app, token, 'PUT', `${url}/${corte.id}`, {})
    await call(app, token, 'PATCH', `/barbershops/${shopId}/services/${corte.id}`, { isActive: false })

    const list = barberServiceListResponseSchema.parse((await call(app, token, 'GET', url)).json()).services
    expect(list).toEqual([expect.objectContaining({ serviceId: corte.id, serviceIsActive: false })])
  })

  it('gerente tira o serviço do barbeiro', async () => {
    const app = await makeApp()
    const { token, corte, url } = await shopWithCorte(app)
    await call(app, token, 'PUT', `${url}/${corte.id}`, {})

    expect((await call(app, token, 'DELETE', `${url}/${corte.id}`)).statusCode).toBe(204)
    expect(barberServiceListResponseSchema.parse((await call(app, token, 'GET', url)).json()).services).toEqual([])
    expect((await call(app, token, 'DELETE', `${url}/${corte.id}`)).statusCode).toBe(404)
  })
})

describe('autorização e barbearia dos serviços do barbeiro', () => {
  it('quem não é gerente recebe 403 ao listar, atribuir e tirar', async () => {
    const app = await makeApp()
    const { corte, url } = await shopWithCorte(app)
    const stranger = await signUp(app, 'outro@exemplo.com')

    expect((await call(app, stranger, 'GET', url)).statusCode).toBe(403)
    expect((await call(app, stranger, 'PUT', `${url}/${corte.id}`, {})).statusCode).toBe(403)
    expect((await call(app, stranger, 'DELETE', `${url}/${corte.id}`)).statusCode).toBe(403)
    expect(await db.barberService.count()).toBe(0)
  })

  it('serviço de outra barbearia não é atribuído (404)', async () => {
    const app = await makeApp()
    const { token, url } = await shopWithCorte(app)
    const other = await shopWithCorte(app, 'outro@exemplo.com')

    const response = await call(app, token, 'PUT', `${url}/${other.corte.id}`, {})

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: 'SERVICE_NOT_FOUND' })
  })

  it('vínculo de outra barbearia não é encontrado pela barbearia do gerente (404)', async () => {
    const app = await makeApp()
    const { token, shopId, corte } = await shopWithCorte(app)
    const other = await shopWithCorte(app, 'outro@exemplo.com')
    const otherMembershipUrl = other.url.replace(`/barbershops/${other.shopId}`, `/barbershops/${shopId}`)

    const response = await call(app, token, 'PUT', `${otherMembershipUrl}/${corte.id}`, {})

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: 'MEMBERSHIP_NOT_FOUND' })
  })

  it('o banco barra ligar vínculo e serviço de barbearias diferentes', async () => {
    const app = await makeApp()
    const mine = await shopWithCorte(app)
    const other = await shopWithCorte(app, 'outro@exemplo.com')
    const membership = await db.barberMembership.findFirstOrThrow({ where: { barbershopId: mine.shopId } })

    await expect(
      db.barberService.create({
        data: { barbershopId: mine.shopId, membershipId: membership.id, serviceId: other.corte.id },
      }),
    ).rejects.toThrow()
  })
})
