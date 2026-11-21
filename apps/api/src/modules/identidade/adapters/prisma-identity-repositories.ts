import type { Db } from '../../../shared/db/prisma'
import { fail, ok } from '../../../shared/result'
import type { SessionRepository, UserRepository } from '../app/ports'

const userFields = { id: true, name: true, email: true, phone: true, passwordHash: true } as const

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'

export function createPrismaUserRepository(db: Db): UserRepository {
  return {
    findByEmail: (email) => db.user.findUnique({ where: { email }, select: userFields }),
    findById: (id) => db.user.findUnique({ where: { id }, select: userFields }),
    async create(user) {
      try {
        return ok(await db.user.create({ data: user, select: userFields }))
      } catch (error) {
        if (isUniqueViolation(error)) return fail('EMAIL_TAKEN')
        throw error
      }
    },
  }
}

/** Consulta para outros módulos: só o id do usuário dono do e-mail (já normalizado em minúsculas). */
export function createPrismaUserDirectory(db: Db) {
  return {
    findIdByEmail: (email: string): Promise<{ id: string } | null> =>
      db.user.findUnique({ where: { email }, select: { id: true } }),
    /** Só id e nome: o que outros módulos podem ver de um usuário (ex.: barbeiro no vínculo). */
    async findNamesByIds(ids: readonly string[]): Promise<Map<string, string>> {
      if (ids.length === 0) return new Map()
      const users = await db.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true } })
      return new Map(users.map((user) => [user.id, user.name]))
    },
  }
}

export function createPrismaSessionRepository(db: Db): SessionRepository {
  return {
    async create(session) {
      await db.session.create({ data: session })
    },
    findByTokenHash: (tokenHash) =>
      db.session.findUnique({ where: { tokenHash }, select: { userId: true, expiresAt: true } }),
    async deleteByTokenHash(tokenHash) {
      await db.session.deleteMany({ where: { tokenHash } })
    },
  }
}
