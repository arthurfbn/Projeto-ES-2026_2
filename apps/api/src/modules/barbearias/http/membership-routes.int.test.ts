import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { barbershopResponseSchema, membershipListResponseSchema, membershipResponseSchema } from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import type { AvailabilityReader } from '../app/ports'
import type { WeeklyWindow } from '../core/allowed-shift'
import { createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)
const clock = fixedClock('2026-11-21T10:00:00-03:00')

// Disponibilidade nasce na #14; aqui um leitor controlado pelo teste faz o papel dela (CA18).
let availability: WeeklyWindow[] = []
const availabilityReader: AvailabilityReader = { weeklyWindows: async () => availability }

async function makeApp() {
  const identity = createIdentityModule({ db, clock, authRateLimit: { max: 1000, timeWindow: '1 minute' } })
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    modules: [
      identity,
      createBarbershopsModule({
        db,
        clock,
        requireUser: identity.requireUser,
        users: createUserDirectory(db),
        availability: availabilityReader,
      }),
    ],
  })
}

type App = Awaited<ReturnType<typeof makeApp>>

async function signUp(app: App, email: string, name = 'Zé Navalha') {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name, email, phone: '11987654321', password: 'segredo123' },
  })
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
}

async function createShop(app: App, token: string, alsoBarber = true) {
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

function call(app: App, token: string, method: 'GET' | 'PUT' | 'PATCH', url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

/** Gerente com o próprio vínculo de barbeiro ("eu também atendo"). */
async function managerWithMembership(app: App) {
  const token = await signUp(app, 'ze@exemplo.com')
  const shopId = await createShop(app, token)
  const list = membershipListResponseSchema.parse((await call(app, token, 'GET', `/barbershops/${shopId}/memberships`)).json())
  const membership = list.memberships[0]
  if (!membership) throw new Error('vínculo do "eu também atendo" não encontrado')
  return { token, shopId, membership, url: `/barbershops/${shopId}/memberships/${membership.id}` }
}

const h = (hours: number) => hours * 60
const segASab = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: h(9), endMinute: h(18) }))

beforeEach(async () => {
  availability = []
  await db.$executeRaw`TRUNCATE TABLE allowed_shifts, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('vínculos da barbearia (R15)', () => {
  it('lista o vínculo do "eu também atendo" com o nome do barbeiro e sem turno', async () => {
    const app = await makeApp()
    const { membership } = await managerWithMembership(app)

    expect(membership).toMatchObject({
      barber: { name: 'Zé Navalha' },
      hiredAt: new Date('2026-11-21T10:00:00-03:00').toISOString(),
      isExclusive: false,
      acceptsAppointments: true,
      isActive: true,
      shift: [],
    })
  })

  it('CA14: gerente define turno seg–sáb 09:00–18:00 e ele aparece no vínculo', async () => {
    const app = await makeApp()
    const { token, shopId, url } = await managerWithMembership(app)

    const response = await call(app, token, 'PUT', `${url}/shift`, { windows: [...segASab].reverse() })

    expect(response.statusCode).toBe(200)
    expect(membershipResponseSchema.parse(response.json()).membership.shift).toEqual(segASab)
    const list = membershipListResponseSchema.parse((await call(app, token, 'GET', `/barbershops/${shopId}/memberships`)).json())
    expect(list.memberships[0]?.shift).toEqual(segASab)
  })

  it('gerente remove o turno (vínculo sem turno é válido)', async () => {
    const app = await makeApp()
    const { token, url } = await managerWithMembership(app)
    await call(app, token, 'PUT', `${url}/shift`, { windows: segASab })

    const response = await call(app, token, 'PUT', `${url}/shift`, { windows: [] })

    expect(response.statusCode).toBe(200)
    expect(membershipResponseSchema.parse(response.json()).membership.shift).toEqual([])
    expect(await db.allowedShift.count()).toBe(0)
  })

  it('CA18: mudança que deixa disponibilidade de fora dá erro e o turno continua o mesmo', async () => {
    const app = await makeApp()
    const { token, url } = await managerWithMembership(app)
    const segunda9as18 = [{ weekday: 1, startMinute: h(9), endMinute: h(18) }]
    await call(app, token, 'PUT', `${url}/shift`, { windows: segunda9as18 })
    availability = [{ weekday: 1, startMinute: h(16), endMinute: h(18) }]

    const response = await call(app, token, 'PUT', `${url}/shift`, {
      windows: [{ weekday: 1, startMinute: h(9), endMinute: h(15) }],
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({
      error: 'AVAILABILITY_OUTSIDE_SHIFT',
      message: 'Há disponibilidade fora do novo turno.',
    })
    const shift = await db.allowedShift.findMany({ select: { weekday: true, startMinute: true, endMinute: true } })
    expect(shift).toEqual(segunda9as18)
  })

  it('recusa janelas sobrepostas no mesmo dia, sem mudar o turno', async () => {
    const app = await makeApp()
    const { token, url } = await managerWithMembership(app)

    const response = await call(app, token, 'PUT', `${url}/shift`, {
      windows: [
        { weekday: 1, startMinute: h(9), endMinute: h(13) },
        { weekday: 1, startMinute: h(12), endMinute: h(18) },
      ],
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'OVERLAPPING_WINDOWS', fields: { windows: expect.any(String) } })
    expect(await db.allowedShift.count()).toBe(0)
  })

  it('o banco também barra janelas sobrepostas do mesmo vínculo', async () => {
    const app = await makeApp()
    const { membership } = await managerWithMembership(app)
    await db.allowedShift.create({ data: { membershipId: membership.id, weekday: 1, startMinute: h(9), endMinute: h(13) } })

    await expect(
      db.allowedShift.create({ data: { membershipId: membership.id, weekday: 1, startMinute: h(12), endMinute: h(18) } }),
    ).rejects.toThrow()
  })

  it('gerente altera se aceita agendamentos e desativa e reativa o vínculo', async () => {
    const app = await makeApp()
    const { token, url } = await managerWithMembership(app)

    const paused = await call(app, token, 'PATCH', url, { acceptsAppointments: false })
    expect(membershipResponseSchema.parse(paused.json()).membership.acceptsAppointments).toBe(false)

    const inactive = await call(app, token, 'PATCH', url, { isActive: false })
    expect(membershipResponseSchema.parse(inactive.json()).membership.isActive).toBe(false)

    const active = await call(app, token, 'PATCH', url, { isActive: true })
    expect(membershipResponseSchema.parse(active.json()).membership.isActive).toBe(true)
  })

  it('não reativa vínculo de quem tem vínculo exclusivo ativo em outra barbearia', async () => {
    const app = await makeApp()
    const { token, url, membership } = await managerWithMembership(app)
    await call(app, token, 'PATCH', url, { isActive: false })
    // Vínculo exclusivo do mesmo barbeiro em outra barbearia (convites são a #10).
    const otherShop = await createShop(app, token, true)
    await db.barberMembership.updateMany({
      where: { userId: membership.barber.id, barbershopId: otherShop },
      data: { isExclusive: true },
    })

    const response = await call(app, token, 'PATCH', url, { isActive: true })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: 'EXCLUSIVITY_CONFLICT' })
  })
})

describe('autorização dos vínculos', () => {
  it('quem não é gerente recebe 403 ao listar, mudar turno e alterar vínculo', async () => {
    const app = await makeApp()
    const { shopId, url } = await managerWithMembership(app)
    const stranger = await signUp(app, 'outro@exemplo.com', 'Outro')

    expect((await call(app, stranger, 'GET', `/barbershops/${shopId}/memberships`)).statusCode).toBe(403)
    expect((await call(app, stranger, 'PUT', `${url}/shift`, { windows: segASab })).statusCode).toBe(403)
    expect((await call(app, stranger, 'PATCH', url, { isActive: false })).statusCode).toBe(403)
    expect(await db.allowedShift.count()).toBe(0)
  })

  it('gerente de outra barbearia não altera vínculo daqui pela própria barbearia (404)', async () => {
    const app = await makeApp()
    const { membership } = await managerWithMembership(app)
    const otherToken = await signUp(app, 'outro@exemplo.com', 'Outro')
    const otherShop = await createShop(app, otherToken, false)

    const response = await call(app, otherToken, 'PATCH', `/barbershops/${otherShop}/memberships/${membership.id}`, {
      isActive: false,
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: 'MEMBERSHIP_NOT_FOUND' })
  })
})
