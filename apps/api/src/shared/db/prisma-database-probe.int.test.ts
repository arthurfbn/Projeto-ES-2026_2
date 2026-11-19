import { afterAll, describe, expect, it } from 'vitest'
import { createDb } from './prisma'
import { createPrismaDatabaseProbe } from './prisma-database-probe'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')

const db = createDb(databaseUrl)

afterAll(async () => {
  await db.$disconnect()
})

describe('PrismaDatabaseProbe (Postgres real)', () => {
  it('detecta o banco no ar', async () => {
    await expect(createPrismaDatabaseProbe(db).isUp()).resolves.toBe(true)
  })

  it('detecta banco inacessível sem lançar exceção', async () => {
    const unreachable = createDb('postgresql://ninguem:x@127.0.0.1:1/nada')
    await expect(createPrismaDatabaseProbe(unreachable).isUp()).resolves.toBe(false)
    await unreachable.$disconnect()
  })
})
