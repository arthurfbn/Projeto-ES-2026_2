import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  availabilityListResponseSchema,
  availabilityResponseSchema,
  barbershopResponseSchema,
  membershipListResponseSchema,
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
// "Hoje" em São Paulo: 2026-11-25.
const clock = fixedClock('2026-11-25T10:00:00-03:00')

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
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function signUp(app: App, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name: 'Zé Navalha', email, phone: '11987654321', password: 'segredo123' },
  })
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? ''
}

function call(app: App, token: string, method: Method, url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as object, cookies: { [SESSION_COOKIE]: token } })
}

async function createShop(app: App, token: string, name: string, alsoBarber = true) {
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

async function membershipOf(app: App, token: string, shopId: string) {
  const list = membershipListResponseSchema.parse((await call(app, token, 'GET', `/barbershops/${shopId}/memberships`)).json())
  const membership = list.memberships[0]
  if (!membership) throw new Error('vínculo não encontrado')
  return membership.id
}

/** Gerente que também atende, numa barbearia "A". */
async function barberInShop(app: App, email = 'ze@exemplo.com', shopName = 'Barbearia A') {
  const token = await signUp(app, email)
  const shopId = await createShop(app, token, shopName)
  const membershipId = await membershipOf(app, token, shopId)
  return { token, shopId, membershipId, url: `/memberships/${membershipId}/availability` }
}

const h = (hours: number) => hours * 60
const seg = (start: number, end: number, validFrom = '2026-11-30', validUntil: string | null = null) => ({
  weekday: 1,
  startMinute: h(start),
  endMinute: h(end),
  validFrom,
  validUntil,
})

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE appointments, barber_availabilities, barber_services, allowed_shifts, invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('disponibilidade do barbeiro (R17–R20)', () => {
  it('CA16: com turno seg 09:00–18:00, seg 10:00–12:00 salva e seg 17:00–19:00 dá "fora do turno"', async () => {
    const app = await makeApp()
    const { token, shopId, membershipId, url } = await barberInShop(app)
    await call(app, token, 'PUT', `/barbershops/${shopId}/memberships/${membershipId}/shift`, {
      windows: [{ weekday: 1, startMinute: h(9), endMinute: h(18) }],
    })

    const inside = await call(app, token, 'POST', url, seg(10, 12))
    expect(inside.statusCode).toBe(201)
    expect(availabilityResponseSchema.parse(inside.json()).availability).toMatchObject(seg(10, 12))

    const outside = await call(app, token, 'POST', url, seg(17, 19))
    expect(outside.statusCode).toBe(409)
    expect(outside.json()).toMatchObject({ error: 'OUTSIDE_SHIFT', message: 'Fora do turno permitido pelo gerente.' })

    const list = availabilityListResponseSchema.parse((await call(app, token, 'GET', url)).json())
    expect(list.availabilities).toEqual([expect.objectContaining(seg(10, 12))])
  })

  it('CA16b: sem turno, dom 07:00–22:00 salva', async () => {
    const app = await makeApp()
    const { token, url } = await barberInShop(app)

    const response = await call(app, token, 'POST', url, { ...seg(7, 22), weekday: 0 })

    expect(response.statusCode).toBe(201)
  })

  it('CA17: seg 11:00–13:00 sobre seg 10:00–12:00 dá sobreposição na mesma barbearia e em outra', async () => {
    const app = await makeApp()
    const a = await barberInShop(app)
    const shopB = await createShop(app, a.token, 'Barbearia B')
    const urlB = `/memberships/${await membershipOf(app, a.token, shopB)}/availability`
    await call(app, a.token, 'POST', a.url, seg(10, 12))

    for (const url of [a.url, urlB]) {
      const response = await call(app, a.token, 'POST', url, seg(11, 13))
      expect(response.statusCode).toBe(409)
      expect(response.json()).toMatchObject({ error: 'OVERLAPPING_AVAILABILITY' })
    }
    expect(await db.barberAvailability.count()).toBe(1)
  })

  it('R20: mesma janela em vigências que não se cruzam é aceita', async () => {
    const app = await makeApp()
    const { token, url } = await barberInShop(app)
    await call(app, token, 'POST', url, seg(10, 12, '2026-11-30', '2026-12-31'))

    expect((await call(app, token, 'POST', url, seg(10, 12, '2027-01-01'))).statusCode).toBe(201)
  })

  it('R18: horário fora do passo ou início depois do fim dá erro no campo', async () => {
    const app = await makeApp()
    const { token, url } = await barberInShop(app)

    const offStep = await call(app, token, 'POST', url, { ...seg(10, 12), startMinute: 610 })
    expect(offStep.statusCode).toBe(400)
    expect(offStep.json()).toMatchObject({ fields: { startMinute: expect.any(String) } })

    const reversed = await call(app, token, 'POST', url, seg(12, 10))
    expect(reversed.statusCode).toBe(400)
    expect(reversed.json()).toMatchObject({ fields: { endMinute: expect.any(String) } })
  })

  it('R17: vínculo inativo não abre agenda', async () => {
    const app = await makeApp()
    const { token, shopId, membershipId, url } = await barberInShop(app)
    await call(app, token, 'PATCH', `/barbershops/${shopId}/memberships/${membershipId}`, { isActive: false })

    const response = await call(app, token, 'POST', url, seg(10, 12))

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: 'MEMBERSHIP_INACTIVE' })
  })

  it('o barbeiro remove uma disponibilidade', async () => {
    const app = await makeApp()
    const { token, url } = await barberInShop(app)
    const { availability } = availabilityResponseSchema.parse((await call(app, token, 'POST', url, seg(10, 12))).json())

    expect((await call(app, token, 'DELETE', `${url}/${availability.id}`)).statusCode).toBe(204)
    expect((await call(app, token, 'DELETE', `${url}/${availability.id}`)).statusCode).toBe(404)
    expect(await db.barberAvailability.count()).toBe(0)
  })
})

describe('autorização da disponibilidade', () => {
  it('R17: só o próprio barbeiro; outro usuário, inclusive gerente da barbearia, recebe 404', async () => {
    const app = await makeApp()
    const owner = await barberInShop(app)
    const { availability } = availabilityResponseSchema.parse(
      (await call(app, owner.token, 'POST', owner.url, seg(10, 12))).json(),
    )
    // Outro gerente da mesma barbearia (gerência montada no banco; convite de gerente é a #10).
    const managerToken = await signUp(app, 'gerente@exemplo.com')
    const manager = await db.user.findUniqueOrThrow({ where: { email: 'gerente@exemplo.com' } })
    await db.barbershopManager.create({ data: { barbershopId: owner.shopId, userId: manager.id } })
    const strangerToken = await signUp(app, 'outro@exemplo.com')

    for (const token of [managerToken, strangerToken]) {
      expect((await call(app, token, 'GET', owner.url)).statusCode).toBe(404)
      expect((await call(app, token, 'POST', owner.url, seg(14, 16))).statusCode).toBe(404)
      expect((await call(app, token, 'DELETE', `${owner.url}/${availability.id}`)).statusCode).toBe(404)
    }
    expect(await db.barberAvailability.count()).toBe(1)
  })

  it('o banco barra disponibilidade sobreposta do mesmo barbeiro (corrida entre dois cadastros)', async () => {
    const app = await makeApp()
    const { token, url } = await barberInShop(app)
    await call(app, token, 'POST', url, seg(10, 12))
    const existing = await db.barberAvailability.findFirstOrThrow()

    await expect(
      db.barberAvailability.create({
        data: {
          barbershopId: existing.barbershopId,
          userId: existing.userId,
          membershipId: existing.membershipId,
          weekday: 1,
          startMinute: h(11),
          endMinute: h(13),
          validFrom: new Date('2026-12-01T00:00:00Z'),
        },
      }),
    ).rejects.toThrow()
  })
})

describe('disponibilidade e as regras de vínculo', () => {
  it('CA18: com disponibilidade seg 16:00–18:00, o gerente não muda o turno para seg 09:00–15:00', async () => {
    const app = await makeApp()
    const { token, shopId, membershipId, url } = await barberInShop(app)
    const shiftUrl = `/barbershops/${shopId}/memberships/${membershipId}/shift`
    await call(app, token, 'PUT', shiftUrl, { windows: [{ weekday: 1, startMinute: h(9), endMinute: h(18) }] })
    await call(app, token, 'POST', url, seg(16, 18))

    const response = await call(app, token, 'PUT', shiftUrl, {
      windows: [{ weekday: 1, startMinute: h(9), endMinute: h(15) }],
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: 'AVAILABILITY_OUTSIDE_SHIFT' })
    expect(await db.allowedShift.findMany({ select: { startMinute: true, endMinute: true } })).toEqual([
      { startMinute: h(9), endMinute: h(18) },
    ])
  })

  it('R21: disponibilidade já encerrada não impede mudar o turno', async () => {
    const app = await makeApp()
    const { token, shopId, membershipId, url } = await barberInShop(app)
    await call(app, token, 'POST', url, seg(16, 18, '2026-11-01', '2026-11-24'))

    const response = await call(app, token, 'PUT', `/barbershops/${shopId}/memberships/${membershipId}/shift`, {
      windows: [{ weekday: 1, startMinute: h(9), endMinute: h(15) }],
    })

    expect(response.statusCode).toBe(200)
  })

  it('R14c: ao aceitar convite exclusivo, as disponibilidades das barbearias deixadas são encerradas na data do aceite', async () => {
    const app = await makeApp()
    const ze = await barberInShop(app)
    await call(app, ze.token, 'POST', ze.url, seg(10, 12, '2026-11-01'))
    await call(app, ze.token, 'POST', ze.url, { ...seg(10, 12, '2026-12-07'), weekday: 2 })

    const ownerC = await signUp(app, 'dono.c@exemplo.com')
    const shopC = await createShop(app, ownerC, 'Barbearia C', false)
    const invitation = sentInvitationResponseSchema.parse(
      (
        await call(app, ownerC, 'POST', `/barbershops/${shopC}/invitations`, {
          email: 'ze@exemplo.com',
          kind: 'barber',
          isExclusive: true,
        })
      ).json(),
    ).invitation
    const accepted = await call(app, ze.token, 'POST', `/invitations/${invitation.id}/accept`, { confirmLeave: true })
    expect(accepted.statusCode).toBe(200)

    const rows = await db.barberAvailability.findMany({ where: { membershipId: ze.membershipId } })
    // A que já valia termina hoje; a que só começaria depois some.
    expect(rows.map((row) => ({ weekday: row.weekday, validUntil: row.validUntil?.toISOString().slice(0, 10) }))).toEqual([
      { weekday: 1, validUntil: '2026-11-25' },
    ])
  })
})
