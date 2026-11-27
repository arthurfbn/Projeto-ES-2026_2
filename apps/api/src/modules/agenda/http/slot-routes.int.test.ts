import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  barbershopResponseSchema,
  sentInvitationResponseSchema,
  serviceResponseSchema,
  slotsResponseSchema,
} from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createBarbershopProfilesQuery, createBarbershopsModule, createBookingCatalog } from '../../barbearias'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import { createAgendaModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)
// Domingo 29/11 à noite; 30/11 é segunda.
const clock = fixedClock('2026-11-29T20:00:00-03:00')
const MONDAY = '2026-11-30'

async function makeApp() {
  const identity = createIdentityModule({
    db,
    clock,
    profiles: createBarbershopProfilesQuery(db),
    authRateLimit: { max: 1000, timeWindow: '1 minute' },
  })
  const users = createUserDirectory(db)
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    modules: [
      identity,
      createBarbershopsModule({ db, clock, requireUser: identity.requireUser, users }),
      createAgendaModule({ db, clock, requireUser: identity.requireUser, catalog: createBookingCatalog(db), users }),
    ],
  })
}

type App = Awaited<ReturnType<typeof makeApp>>
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH'

function call(app: App, token: string, method: Method, url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

async function signUp(app: App, name: string, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name, email, phone: '11987654321', password: 'segredo123' },
  })
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
}

const membershipIdOf = async (barbershopId: string, email: string) =>
  (await db.barberMembership.findFirstOrThrow({ where: { barbershopId, user: { email } } })).id

const monday = (startHour: number, endHour: number) => ({
  weekday: 1,
  startMinute: startHour * 60,
  endMinute: endHour * 60,
  validFrom: '2026-11-01',
})

/** Navalha: Léo (gerente que atende) faz Corte de 30 min por R$ 50, seg 09:00–12:00. */
async function navalha(app: App) {
  const leoToken = await signUp(app, 'Léo', 'leo@exemplo.com')
  const shop = await call(app, leoToken, 'POST', '/barbershops', {
    name: 'Navalha',
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1578',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    alsoBarber: true,
  })
  const shopId = barbershopResponseSchema.parse(shop.json()).barbershop.id
  const service = await call(app, leoToken, 'POST', `/barbershops/${shopId}/services`, {
    name: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
  })
  const serviceId = serviceResponseSchema.parse(service.json()).service.id
  const leo = await membershipIdOf(shopId, 'leo@exemplo.com')
  await call(app, leoToken, 'PUT', `/barbershops/${shopId}/memberships/${leo}/services/${serviceId}`, {})
  await call(app, leoToken, 'POST', `/memberships/${leo}/availability`, monday(9, 12))
  return { leoToken, shopId, serviceId, leo, url: `/barbershops/${shopId}/services/${serviceId}/slots` }
}

/** Bia entra por convite e faz Corte por R$ 40, seg 10:00–11:00. */
async function addBia(app: App, shop: Awaited<ReturnType<typeof navalha>>) {
  const biaToken = await signUp(app, 'Bia', 'bia@exemplo.com')
  const invitation = sentInvitationResponseSchema.parse(
    (await call(app, shop.leoToken, 'POST', `/barbershops/${shop.shopId}/invitations`, {
      email: 'bia@exemplo.com',
      kind: 'barber',
    })).json(),
  ).invitation
  await call(app, biaToken, 'POST', `/invitations/${invitation.id}/accept`)
  const bia = await membershipIdOf(shop.shopId, 'bia@exemplo.com')
  await call(app, shop.leoToken, 'PUT', `/barbershops/${shop.shopId}/memberships/${bia}/services/${shop.serviceId}`, {
    priceCents: 4000,
  })
  await call(app, biaToken, 'POST', `/memberships/${bia}/availability`, monday(10, 11))
  return { biaToken, bia }
}

const localTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

async function slotsOf(app: App, token: string, url: string) {
  const response = await call(app, token, 'GET', url)
  expect(response.statusCode).toBe(200)
  return slotsResponseSchema.parse(response.json())
}

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE appointments, barber_availabilities, barber_services, allowed_shifts, invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('horários livres (R5–R8)', () => {
  it('CA4: seg 09:00–12:00 e Corte de 30 min dá 09:00…11:30 de 15 em 15, com o barbeiro e o preço', async () => {
    const app = await makeApp()
    const shop = await navalha(app)

    const body = await slotsOf(app, shop.leoToken, `${shop.url}?date=${MONDAY}&membershipId=${shop.leo}`)

    expect(body.slots.map((slot) => localTime(slot.startsAt))).toEqual([
      '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30',
    ])
    expect(body.slots[0]?.barber).toEqual({ membershipId: shop.leo, name: 'Léo', priceCents: 5000, durationMinutes: 30 })
    expect(body).toMatchObject({ date: MONDAY, fromPriceCents: 5000, pricesDiffer: false })
  })

  it('CA6: "qualquer barbeiro" une os horários, atribui em cada um e mostra "a partir de"', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    await addBia(app, shop)

    const body = await slotsOf(app, shop.leoToken, `${shop.url}?date=${MONDAY}`)

    const byTime = new Map(body.slots.map((slot) => [localTime(slot.startsAt), slot.barber]))
    expect(byTime.size).toBe(11)
    expect(byTime.get('09:00')?.name).toBe('Léo')
    // Empate no número de agendamentos do dia: vai o de menor preço.
    expect(byTime.get('10:00')).toMatchObject({ name: 'Bia', priceCents: 4000 })
    expect(body).toMatchObject({ fromPriceCents: 4000, pricesDiffer: true })
  })

  it('R7: barbeiro sem aceitar agendamentos, sem o serviço ou com serviço inativo não tem horário', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const biaToken = await signUp(app, 'Bia', 'bia@exemplo.com')
    const invitation = sentInvitationResponseSchema.parse(
      (await call(app, shop.leoToken, 'POST', `/barbershops/${shop.shopId}/invitations`, {
        email: 'bia@exemplo.com',
        kind: 'barber',
      })).json(),
    ).invitation
    await call(app, biaToken, 'POST', `/invitations/${invitation.id}/accept`)
    const biaWithoutService = await membershipIdOf(shop.shopId, 'bia@exemplo.com')

    expect((await slotsOf(app, shop.leoToken, `${shop.url}?date=${MONDAY}&membershipId=${biaWithoutService}`)).slots).toEqual([])

    await call(app, shop.leoToken, 'PATCH', `/barbershops/${shop.shopId}/memberships/${shop.leo}`, {
      acceptsAppointments: false,
    })
    expect((await slotsOf(app, shop.leoToken, `${shop.url}?date=${MONDAY}`)).slots).toEqual([])

    await call(app, shop.leoToken, 'PATCH', `/barbershops/${shop.shopId}/memberships/${shop.leo}`, {
      acceptsAppointments: true,
    })
    await call(app, shop.leoToken, 'PATCH', `/barbershops/${shop.shopId}/services/${shop.serviceId}`, { isActive: false })
    expect(await slotsOf(app, shop.leoToken, `${shop.url}?date=${MONDAY}`)).toMatchObject({
      slots: [],
      fromPriceCents: null,
    })
  })

  it('só para quem entrou; serviço de outra barbearia é 404; data inválida é 400', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const anaToken = await signUp(app, 'Ana', 'ana@exemplo.com')
    const capital = barbershopResponseSchema.parse(
      (await call(app, anaToken, 'POST', '/barbershops', {
        name: 'Capital',
        cep: '01310100',
        street: 'Avenida Paulista',
        number: '900',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        alsoBarber: false,
      })).json(),
    ).barbershop.id

    const visitor = await app.inject({ method: 'GET', url: `${shop.url}?date=${MONDAY}` })
    expect(visitor.statusCode).toBe(401)

    const elsewhere = await call(app, anaToken, 'GET', `/barbershops/${capital}/services/${shop.serviceId}/slots?date=${MONDAY}`)
    expect(elsewhere.statusCode).toBe(404)
    expect(elsewhere.json()).toMatchObject({ error: 'SERVICE_NOT_FOUND' })

    const badDate = await call(app, anaToken, 'GET', `${shop.url}?date=30/11/2026`)
    expect(badDate.statusCode).toBe(400)
  })
})
