import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  barbershopPageResponseSchema,
  barbershopResponseSchema,
  barbershopSearchResponseSchema,
  platformServicesResponseSchema,
  sentInvitationResponseSchema,
  serviceResponseSchema,
} from '@shavey/contracts'
import { buildApp } from '../../../app'
import { fixedClock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, createUserDirectory, SESSION_COOKIE } from '../../identidade'
import { createBarbershopProfilesQuery, createBarbershopsModule } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)
const clock = fixedClock('2026-11-27T10:00:00-03:00')

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

function call(app: App, token: string, method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) {
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

async function createShop(app: App, token: string, name: string, neighborhood: string, alsoBarber: boolean) {
  const response = await call(app, token, 'POST', '/barbershops', {
    name,
    cep: '01310100',
    street: 'Avenida Paulista',
    number: '1578',
    neighborhood,
    city: 'São Paulo',
    state: 'SP',
    alsoBarber,
  })
  return barbershopResponseSchema.parse(response.json()).barbershop.id
}

async function createService(app: App, token: string, shopId: string, name: string, priceCents: number) {
  const response = await call(app, token, 'POST', `/barbershops/${shopId}/services`, {
    name,
    priceCents,
    durationMinutes: 30,
  })
  return serviceResponseSchema.parse(response.json()).service.id
}

const membershipIdOf = async (barbershopId: string, email: string) =>
  (await db.barberMembership.findFirstOrThrow({ where: { barbershopId, user: { email } } })).id

function performs(app: App, token: string, shopId: string, membershipId: string, serviceId: string, priceCents?: number) {
  return call(app, token, 'PUT', `/barbershops/${shopId}/memberships/${membershipId}/services/${serviceId}`, {
    priceCents: priceCents ?? null,
  })
}

/**
 * Navalha (Bela Vista): Corte padrão R$ 40; Léo faz por R$ 50 (próprio) e Bia pelo padrão.
 * Capital (Consolação): Ana faz "corte". Sem Equipe: tem serviço, mas nenhum barbeiro.
 */
async function scenario(app: App) {
  const leo = await signUp(app, 'Léo', 'leo@exemplo.com')
  const navalha = await createShop(app, leo, 'Navalha', 'Bela Vista', true)
  const corte = await createService(app, leo, navalha, 'Corte', 4000)
  await performs(app, leo, navalha, await membershipIdOf(navalha, 'leo@exemplo.com'), corte, 5000)

  const bia = await signUp(app, 'Bia', 'bia@exemplo.com')
  const invitation = sentInvitationResponseSchema.parse(
    (await call(app, leo, 'POST', `/barbershops/${navalha}/invitations`, { email: 'bia@exemplo.com', kind: 'barber' })).json(),
  ).invitation
  await call(app, bia, 'POST', `/invitations/${invitation.id}/accept`)
  await performs(app, leo, navalha, await membershipIdOf(navalha, 'bia@exemplo.com'), corte)

  const ana = await signUp(app, 'Ana', 'ana@exemplo.com')
  const capital = await createShop(app, ana, 'Capital', 'Consolação', true)
  const corteCapital = await createService(app, ana, capital, 'corte', 3500)
  await performs(app, ana, capital, await membershipIdOf(capital, 'ana@exemplo.com'), corteCapital)

  const semEquipe = await createShop(app, ana, 'Sem Equipe', 'Bela Vista', false)
  await createService(app, ana, semEquipe, 'Corte', 3000)

  const client = await signUp(app, 'Zé', 'ze@exemplo.com')
  return { client, navalha, capital, semEquipe }
}

const namesOf = async (app: App, token: string, query: string) => {
  const response = await call(app, token, 'GET', `/barbershops/search?${query}`)
  expect(response.statusCode).toBe(200)
  return barbershopSearchResponseSchema.parse(response.json()).barbershops.map((shop) => shop.name)
}

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE barber_availabilities, barber_services, allowed_shifts, invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('descoberta (R1–R3)', () => {
  it('CA1: acha a Navalha por bairro ou nome, sem caixa nem acento; sem barbeiro agendável não aparece', async () => {
    const app = await makeApp()
    const { client } = await scenario(app)

    expect(await namesOf(app, client, 'q=bela%20vista')).toEqual(['Navalha'])
    expect(await namesOf(app, client, 'q=NAVALHA')).toEqual(['Navalha'])
    expect(await namesOf(app, client, 'q=consolacao')).toEqual(['Capital'])
    expect(await namesOf(app, client, 'q=sem%20equipe')).toEqual([])
  })

  it('CA2: chips agrupam "Corte" e "corte", e o chip lista as duas barbearias', async () => {
    const app = await makeApp()
    const { client } = await scenario(app)

    const chips = platformServicesResponseSchema.parse((await call(app, client, 'GET', '/platform-services')).json())
    expect(chips.services).toEqual([{ key: 'corte', name: 'Corte' }])

    expect(await namesOf(app, client, 'service=corte')).toEqual(['Capital', 'Navalha'])
  })

  it('CA3: a página da Navalha mostra o Corte com Bia R$ 40 e Léo R$ 50, para qualquer um que entrou', async () => {
    const app = await makeApp()
    const { client, navalha } = await scenario(app)

    const response = await call(app, client, 'GET', `/barbershops/${navalha}/page`)

    expect(response.statusCode).toBe(200)
    const page = barbershopPageResponseSchema.parse(response.json())
    expect(page.barbershop).toMatchObject({ name: 'Navalha', neighborhood: 'Bela Vista' })
    expect(page.services).toEqual([
      {
        id: expect.any(String),
        name: 'Corte',
        barbers: [
          expect.objectContaining({ name: 'Bia', priceCents: 4000, durationMinutes: 30 }),
          expect.objectContaining({ name: 'Léo', priceCents: 5000, durationMinutes: 30 }),
        ],
      },
    ])
  })

  it('barbearia sem barbeiro agendável abre a página sem serviços', async () => {
    const app = await makeApp()
    const { client, semEquipe } = await scenario(app)

    const page = barbershopPageResponseSchema.parse((await call(app, client, 'GET', `/barbershops/${semEquipe}/page`)).json())

    expect(page.services).toEqual([])
  })

  it('visitante recebe 401; barbearia inexistente é 404; busca vazia é 400', async () => {
    const app = await makeApp()
    const { client, navalha } = await scenario(app)

    for (const url of ['/barbershops/search?q=navalha', '/platform-services', `/barbershops/${navalha}/page`]) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401)
    }
    const missing = await call(app, client, 'GET', '/barbershops/0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11/page')
    expect(missing.statusCode).toBe(404)
    expect((await call(app, client, 'GET', '/barbershops/search?q=')).statusCode).toBe(400)
  })
})
