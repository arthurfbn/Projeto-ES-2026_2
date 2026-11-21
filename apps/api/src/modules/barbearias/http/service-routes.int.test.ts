import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  barbershopResponseSchema,
  serviceListResponseSchema,
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
const clock = fixedClock('2026-11-21T10:00:00-03:00')

async function makeApp() {
  const identity = createIdentityModule({ db, clock, authRateLimit: { max: 1000, timeWindow: '1 minute' } })
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    modules: [identity, createBarbershopsModule({ db, clock, requireUser: identity.requireUser, users: createUserDirectory(db) })],
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

async function createShop(app: App, token: string, alsoBarber = false) {
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
      alsoBarber,
    },
  })
  return barbershopResponseSchema.parse(response.json()).barbershop.id
}

function call(app: App, token: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

const corte = { name: 'Corte', priceCents: 4000, durationMinutes: 30 }

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('serviços da barbearia (R9)', () => {
  it('CA7: recusa 20 min; cria 30 min e R$ 40,00; desativado continua listado como inativo', async () => {
    const app = await makeApp()
    const token = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, token)
    const url = `/barbershops/${shopId}/services`

    const wrongDuration = await call(app, token, 'POST', url, { ...corte, durationMinutes: 20 })
    expect(wrongDuration.statusCode).toBe(400)
    expect(apiErrorSchema.parse(wrongDuration.json()).fields).toHaveProperty('durationMinutes')

    const created = await call(app, token, 'POST', url, corte)
    expect(created.statusCode).toBe(201)
    const service = serviceResponseSchema.parse(created.json()).service
    expect(service).toMatchObject({ ...corte, isActive: true })

    const list = serviceListResponseSchema.parse((await call(app, token, 'GET', url)).json())
    expect(list.services).toEqual([service])

    const deactivated = await call(app, token, 'PATCH', `${url}/${service.id}`, { isActive: false })
    expect(deactivated.statusCode).toBe(200)

    const after = serviceListResponseSchema.parse((await call(app, token, 'GET', url)).json())
    expect(after.services).toEqual([{ ...service, isActive: false }])
    expect(await db.service.count()).toBe(1)
  })

  it('gerente altera nome, preço e duração; e reativa o serviço', async () => {
    const app = await makeApp()
    const token = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, token)
    const url = `/barbershops/${shopId}/services`
    const { service } = serviceResponseSchema.parse((await call(app, token, 'POST', url, corte)).json())

    const edited = await call(app, token, 'PATCH', `${url}/${service.id}`, {
      name: 'Corte degradê',
      priceCents: 5500,
      durationMinutes: 45,
    })
    expect(edited.statusCode).toBe(200)
    expect(serviceResponseSchema.parse(edited.json()).service).toEqual({
      id: service.id,
      name: 'Corte degradê',
      priceCents: 5500,
      durationMinutes: 45,
      isActive: true,
    })

    await call(app, token, 'PATCH', `${url}/${service.id}`, { isActive: false })
    const reactivated = await call(app, token, 'PATCH', `${url}/${service.id}`, { isActive: true })
    expect(serviceResponseSchema.parse(reactivated.json()).service.isActive).toBe(true)
  })

  it('edição com duração inválida não muda nada', async () => {
    const app = await makeApp()
    const token = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, token)
    const url = `/barbershops/${shopId}/services`
    const { service } = serviceResponseSchema.parse((await call(app, token, 'POST', url, corte)).json())

    const response = await call(app, token, 'PATCH', `${url}/${service.id}`, { durationMinutes: 20 })

    expect(response.statusCode).toBe(400)
    expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).durationMinutes).toBe(30)
  })
})

describe('autorização dos serviços (CA8)', () => {
  it('CA8: quem não é gerente recebe 403 ao criar, listar e editar, mesmo sendo barbeiro da casa', async () => {
    const app = await makeApp()
    const managerToken = await signUp(app, 'ze@exemplo.com')
    const shopId = await createShop(app, managerToken)
    const url = `/barbershops/${shopId}/services`
    const { service } = serviceResponseSchema.parse((await call(app, managerToken, 'POST', url, corte)).json())

    const strangerToken = await signUp(app, 'outro@exemplo.com')
    // Barbeiro sem gerência na barbearia (vínculo montado no banco; convites são a #10).
    const barberToken = await signUp(app, 'barbeiro@exemplo.com')
    const barber = await db.user.findUniqueOrThrow({ where: { email: 'barbeiro@exemplo.com' } })
    const manager = await db.user.findUniqueOrThrow({ where: { email: 'ze@exemplo.com' } })
    await db.barberMembership.create({
      data: {
        barbershopId: shopId,
        userId: barber.id,
        approvedByUserId: manager.id,
        hiredAt: clock.now(),
        isExclusive: false,
        acceptsAppointments: true,
        isActive: true,
      },
    })

    for (const token of [strangerToken, barberToken]) {
      const create = await call(app, token, 'POST', url, corte)
      expect(create.statusCode).toBe(403)
      expect(create.json()).toMatchObject({ error: 'NOT_A_MANAGER' })
      expect((await call(app, token, 'GET', url)).statusCode).toBe(403)
      expect((await call(app, token, 'PATCH', `${url}/${service.id}`, { isActive: false })).statusCode).toBe(403)
    }
    expect(await db.service.count()).toBe(1)
    expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).isActive).toBe(true)
  })

  it('gerente de outra barbearia não edita serviço daqui pela própria barbearia (404)', async () => {
    const app = await makeApp()
    const zeToken = await signUp(app, 'ze@exemplo.com')
    const zeShop = await createShop(app, zeToken)
    const { service } = serviceResponseSchema.parse(
      (await call(app, zeToken, 'POST', `/barbershops/${zeShop}/services`, corte)).json(),
    )

    const otherToken = await signUp(app, 'outro@exemplo.com')
    const otherShop = await createShop(app, otherToken)

    const response = await call(app, otherToken, 'PATCH', `/barbershops/${otherShop}/services/${service.id}`, {
      priceCents: 1,
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: 'SERVICE_NOT_FOUND' })
    expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).priceCents).toBe(4000)
  })

  it('sem sessão responde 401; barbearia com id malformado responde 404', async () => {
    const app = await makeApp()
    const token = await signUp(app, 'ze@exemplo.com')

    expect((await call(app, 'token-inventado', 'GET', '/barbershops/x/services')).statusCode).toBe(401)
    expect((await call(app, token, 'GET', '/barbershops/nao-e-uuid/services')).statusCode).toBe(404)
  })
})
