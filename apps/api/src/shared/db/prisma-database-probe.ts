import type { DatabaseProbe } from '../health/database-probe'
import type { Db } from './prisma'

/** Adapter Prisma da porta DatabaseProbe. */
export function createPrismaDatabaseProbe(db: Db): DatabaseProbe {
  return {
    async isUp() {
      try {
        await db.$queryRaw`SELECT 1`
        return true
      } catch {
        return false
      }
    },
  }
}
