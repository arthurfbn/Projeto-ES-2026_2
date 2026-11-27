import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appointmentResponseSchema,
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
const at = (time: string) => `2026-11-30T${time}:00-03:00`

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

function call(app: App, token: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, payload?: unknown) {
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

/** Navalha: Léo (gerente) faz Corte de 30 min por R$ 50 (padrão), seg 09:00–12:00. */
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
  return { leoToken, shopId, serviceId, leo, url: `/barbershops/${shopId}/appointments` }
}

type Shop = Awaited<ReturnType<typeof navalha>>

/** Bia entra por convite e faz Corte por R$ 40, seg 10:00–11:00. */
async function addBia(app: App, shop: Shop) {
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
  return bia
}

const book = (app: App, token: string, shop: Shop, startsAt: string, membershipId?: string) =>
  call(app, token, 'POST', shop.url, {
    serviceId: shop.serviceId,
    startsAt,
    paymentMethod: 'on_site',
    ...(membershipId ? { membershipId } : {}),
  })

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE appointments, barber_availabilities, barber_services, allowed_shifts, invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('agendar pagando no local (R9–R11)', () => {
  it('CA7: nasce confirmado com preço e duração congelados; mudar o preço depois não altera', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')

    const response = await book(app, ze, shop, at('10:00'), shop.leo)

    expect(response.statusCode).toBe(201)
    const { appointment } = appointmentResponseSchema.parse(response.json())
    expect(appointment).toMatchObject({
      barber: { membershipId: shop.leo, name: 'Léo' },
      startsAt: '2026-11-30T13:00:00.000Z',
      endsAt: '2026-11-30T13:30:00.000Z',
      priceCents: 5000,
      durationMinutes: 30,
      paymentMethod: 'on_site',
      status: 'confirmed',
    })

    await call(app, shop.leoToken, 'PATCH', `/barbershops/${shop.shopId}/services/${shop.serviceId}`, { priceCents: 6000 })
    const saved = await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } })
    expect(saved).toMatchObject({ priceCents: 5000, durationMinutes: 30, clientUserId: expect.any(String) })
  })

  it('CA8: dois clientes no mesmo horário ao mesmo tempo: um agenda, o outro recebe "não está mais livre"', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    const ana = await signUp(app, 'Ana', 'ana@exemplo.com')

    const responses = await Promise.all([book(app, ze, shop, at('10:00'), shop.leo), book(app, ana, shop, at('10:00'), shop.leo)])

    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409])
    const refused = responses.find((response) => response.statusCode === 409)
    expect(refused?.json()).toEqual({
      error: 'SLOT_NOT_AVAILABLE',
      message: 'Esse horário não está mais livre. Escolha outro.',
    })
    expect(await db.appointment.count()).toBe(1)
  })

  it('o horário agendado (e os que se sobrepõem a ele) some dos horários livres', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    await book(app, ze, shop, at('10:00'), shop.leo)

    const slots = slotsResponseSchema.parse(
      (await call(app, ze, 'GET', `/barbershops/${shop.shopId}/services/${shop.serviceId}/slots?date=2026-11-30`)).json(),
    )
    const starts = slots.slots.map((slot) => slot.startsAt)

    expect(starts).toContain('2026-11-30T12:30:00.000Z')
    expect(starts).not.toContain('2026-11-30T12:45:00.000Z')
    expect(starts).not.toContain('2026-11-30T13:00:00.000Z')
    expect(starts).not.toContain('2026-11-30T13:15:00.000Z')
    expect(starts).toContain('2026-11-30T13:30:00.000Z')
  })

  it('"qualquer barbeiro" atribui quem tem menos agendamentos no dia, com o preço dele', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const bia = await addBia(app, shop)
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')
    // Bia ganha um agendamento no dia; às 10:30 ambos estão livres e o Léo tem menos.
    await book(app, ze, shop, at('10:00'), bia)

    const response = await book(app, ze, shop, at('10:30'))

    expect(response.statusCode).toBe(201)
    expect(appointmentResponseSchema.parse(response.json()).appointment).toMatchObject({
      barber: { name: 'Léo' },
      priceCents: 5000,
    })
  })

  it.each([
    ['fora da janela de 30 minutos', '2026-11-29T20:15:00-03:00'],
    ['fora da disponibilidade', at('12:00')],
    ['fora do passo de 15 minutos', at('10:05')],
  ])('horário %s dá erro e nada é criado', async (_caso, startsAt) => {
    const app = await makeApp()
    const shop = await navalha(app)
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')

    const response = await book(app, ze, shop, startsAt, shop.leo)

    expect(response.statusCode).toBe(409)
    expect(await db.appointment.count()).toBe(0)
  })

  it('só para quem entrou; serviço de outra barbearia é 404; pagamento online ainda não é aceito', async () => {
    const app = await makeApp()
    const shop = await navalha(app)
    const ze = await signUp(app, 'Zé', 'ze@exemplo.com')

    const visitor = await app.inject({ method: 'POST', url: shop.url, payload: { serviceId: shop.serviceId } })
    expect(visitor.statusCode).toBe(401)

    const other = barbershopResponseSchema.parse(
      (await call(app, ze, 'POST', '/barbershops', {
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
    const elsewhere = await call(app, ze, 'POST', `/barbershops/${other}/appointments`, {
      serviceId: shop.serviceId,
      startsAt: at('10:00'),
      paymentMethod: 'on_site',
    })
    expect(elsewhere.statusCode).toBe(404)

    const online = await call(app, ze, 'POST', shop.url, {
      serviceId: shop.serviceId,
      startsAt: at('10:00'),
      paymentMethod: 'online',
    })
    expect(online.statusCode).toBe(400)
  })
})
