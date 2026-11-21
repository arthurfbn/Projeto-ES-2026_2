import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { apiErrorSchema, barbershopResponseSchema, type CreateBarbershopRequest } from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, SESSION_COOKIE } from '../../identidade'
import { createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)

const now = '2026-11-21T10:00:00-03:00'
const clock = fixedClock(now)

async function makeApp() {
  const identity = createIdentityModule({ db, clock, authRateLimit: { max: 1000, timeWindow: '1 minute' } })
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    modules: [
      identity,
      createBarbershopsModule({ db, clock, requireUser: identity.requireUser, findUserNames: identity.findUserNames }),
    ],
  })
}

type App = Awaited<ReturnType<typeof makeApp>>

/** Cadastra um usuário e devolve o token da sessão e o id. */
async function signUp(app: App, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name: 'Zé Navalha', email, phone: '11987654321', password: 'segredo123' },
  })
  const token = response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
  const userId = (response.json() as { user: { id: string } }).user.id
  return { token, userId }
}

const validShop: CreateBarbershopRequest = {
  name: 'Barbearia do Zé',
  cep: '01310-100',
  street: 'Avenida Paulista',
  number: '1578',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
}

function createShop(app: App, token: string, payload: Record<string, unknown> = validShop) {
  return app.inject({ method: 'POST', url: '/barbershops', payload, cookies: { [SESSION_COOKIE]: token } })
}

function getShop(app: App, token: string, barbershopId: string) {
  return app.inject({ method: 'GET', url: `/barbershops/${barbershopId}`, cookies: { [SESSION_COOKIE]: token } })
}

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('POST /barbershops (R7, R8)', () => {
  it('CA5: sem "eu também atendo", o criador aparece só como gerente', async () => {
    const app = await makeApp()
    const { token, userId } = await signUp(app, 'ze@exemplo.com')

    const response = await createShop(app, token)

    expect(response.statusCode).toBe(201)
    const body = barbershopResponseSchema.parse(response.json())
    expect(body.roles).toEqual({ manager: true, barber: false })
    expect(body.barbershop).toMatchObject({ name: 'Barbearia do Zé', cep: '01310100', state: 'SP', complement: null })

    expect(await db.barbershopManager.count({ where: { userId, barbershopId: body.barbershop.id } })).toBe(1)
    expect(await db.barberMembership.count()).toBe(0)
  })

  it('CA5: com "eu também atendo", vira gerente e barbeiro com vínculo ativo aprovado por ele mesmo', async () => {
    const app = await makeApp()
    const { token, userId } = await signUp(app, 'ze@exemplo.com')

    const response = await createShop(app, token, { ...validShop, alsoBarber: true })

    expect(response.statusCode).toBe(201)
    const body = barbershopResponseSchema.parse(response.json())
    expect(body.roles).toEqual({ manager: true, barber: true })

    const membership = await db.barberMembership.findFirstOrThrow({ where: { barbershopId: body.barbershop.id } })
    expect(membership).toMatchObject({
      userId,
      approvedByUserId: userId,
      hiredAt: new Date(now),
      isExclusive: false,
      acceptsAppointments: true,
      isActive: true,
    })
  })

  it.each([
    ['CEP com 7 dígitos', { cep: '0131010' }, 'cep'],
    ['UF inexistente', { state: 'XX' }, 'state'],
  ])('CA6: %s dá erro no campo e nada é criado', async (_caso, change, field) => {
    const app = await makeApp()
    const { token } = await signUp(app, 'ze@exemplo.com')

    const response = await createShop(app, token, { ...validShop, ...change })

    expect(response.statusCode).toBe(400)
    expect(apiErrorSchema.parse(response.json()).fields).toHaveProperty(field)
    expect(await db.barbershop.count()).toBe(0)
  })

  it('R14b: com vínculo exclusivo ativo, recusa "eu também atendo" e nada é criado', async () => {
    const app = await makeApp()
    const { token, userId } = await signUp(app, 'ze@exemplo.com')
    const first = barbershopResponseSchema.parse((await createShop(app, token, { ...validShop, alsoBarber: true })).json())
    // Vínculo exclusivo só nasce de convite (#10); aqui o estado é montado direto no banco.
    await db.barberMembership.updateMany({ where: { userId }, data: { isExclusive: true } })

    const response = await createShop(app, token, { ...validShop, name: 'Outra', alsoBarber: true })

    expect(response.statusCode).toBe(409)
    expect(apiErrorSchema.parse(response.json())).toMatchObject({
      error: 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE',
      fields: { alsoBarber: expect.any(String) },
    })
    expect(await db.barbershop.count()).toBe(1)
    expect((await db.barbershop.findFirstOrThrow()).id).toBe(first.barbershop.id)
  })

  it('sem sessão responde 401', async () => {
    const app = await makeApp()
    expect((await createShop(app, 'token-inventado')).statusCode).toBe(401)
  })
})

describe('GET /barbershops/:barbershopId', () => {
  it('mostra a barbearia e os perfis de quem consulta', async () => {
    const app = await makeApp()
    const { token } = await signUp(app, 'ze@exemplo.com')
    const created = barbershopResponseSchema.parse((await createShop(app, token, { ...validShop, alsoBarber: true })).json())

    const response = await getShop(app, token, created.barbershop.id)

    expect(response.statusCode).toBe(200)
    expect(barbershopResponseSchema.parse(response.json())).toEqual(created)
  })

  it('usuário sem perfil na barbearia recebe 404 (não revela que ela existe)', async () => {
    const app = await makeApp()
    const ze = await signUp(app, 'ze@exemplo.com')
    const outro = await signUp(app, 'outro@exemplo.com')
    const created = barbershopResponseSchema.parse((await createShop(app, ze.token)).json())

    const response = await getShop(app, outro.token, created.barbershop.id)

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: 'BARBERSHOP_NOT_FOUND' })
  })

  it('id inexistente ou malformado responde 404', async () => {
    const app = await makeApp()
    const { token } = await signUp(app, 'ze@exemplo.com')

    expect((await getShop(app, token, '00000000-0000-4000-8000-000000000000')).statusCode).toBe(404)
    expect((await getShop(app, token, 'nao-e-uuid')).statusCode).toBe(404)
  })
})
