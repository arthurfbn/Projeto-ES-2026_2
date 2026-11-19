import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

export type Db = PrismaClient

/** Cria o cliente do banco. Só adapters e a composição recebem esta instância (ADR-0017). */
export function createDb(databaseUrl: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
}
