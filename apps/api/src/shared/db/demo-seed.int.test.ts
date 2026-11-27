import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createDb } from './prisma'
import { DEMO_EMAIL_DOMAIN, seedDemo } from './demo-seed'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)
// O hash real (argon2) fica no script; aqui basta um valor fixo.
const passwordHash = 'hash-de-teste'

beforeEach(async () => {
  await db.$executeRaw`TRUNCATE TABLE barber_availabilities, barber_services, allowed_shifts, invitations, services, barber_memberships, barbershop_managers, barbershops, sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('seed da demo', () => {
  it('cria 4 barbearias agendáveis, 10 barbeiros e 20 clientes, com contas no domínio da demo', async () => {
    expect(await seedDemo(db, passwordHash)).toEqual({ created: true })

    const bookable = await db.barbershop.count({
      where: {
        services: {
          some: { isActive: true, barberServices: { some: { membership: { isActive: true, acceptsAppointments: true } } } },
        },
      },
    })
    expect(bookable).toBe(4)
    expect(await db.user.count({ where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } })).toBe(31)
    expect(await db.user.count({ where: { barberMemberships: { some: {} } } })).toBe(10)
    expect(await db.barberAvailability.count()).toBeGreaterThan(0)
  })

  it('tem um barbeiro em duas barbearias, sem sobreposição (garantida pela constraint do banco)', async () => {
    await seedDemo(db, passwordHash)

    const carlos = await db.user.findUniqueOrThrow({
      where: { email: `carlos.melo@${DEMO_EMAIL_DOMAIN}` },
      select: { barberMemberships: { select: { barbershopId: true } } },
    })
    expect(new Set(carlos.barberMemberships.map((membership) => membership.barbershopId)).size).toBe(2)
  })

  it('rodar de novo não duplica nada', async () => {
    await seedDemo(db, passwordHash)

    expect(await seedDemo(db, passwordHash)).toEqual({ created: false })
    expect(await db.barbershop.count()).toBe(4)
  })
})
