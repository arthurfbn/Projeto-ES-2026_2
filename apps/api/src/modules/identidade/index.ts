import type { FastifyInstance } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createArgon2PasswordHasher } from './adapters/argon2-password-hasher'
import { createPrismaSessionRepository, createPrismaUserRepository } from './adapters/prisma-identity-repositories'
import type { IdentityPorts } from './app/ports'
import { createRequireUser, registerIdentityRoutes, type AuthRateLimit } from './http/routes'

/**
 * API pública do módulo identidade (contas e sessão). Outros módulos usam só o que sai daqui:
 * `requireUser` como preHandler e o tipo `AuthUser` em `request.user`.
 */
export type { AuthUser } from './app/use-cases'
export { SESSION_COOKIE } from './http/routes'

export type IdentityModuleOptions = {
  db: Db
  clock: Clock
  /** Limite de tentativas de cadastro/login por IP (skill seguranca-authz). */
  authRateLimit?: AuthRateLimit
}

export function createIdentityModule(options: IdentityModuleOptions) {
  const ports: IdentityPorts = {
    users: createPrismaUserRepository(options.db),
    sessions: createPrismaSessionRepository(options.db),
    hasher: createArgon2PasswordHasher(),
    clock: options.clock,
  }
  const rateLimit = options.authRateLimit ?? { max: 10, timeWindow: '1 minute' }

  return {
    /** Registra no nível raiz do app (decorator de request + rotas /auth e /me). */
    register(app: FastifyInstance) {
      app.decorateRequest('user', null)
      registerIdentityRoutes(app, ports, rateLimit)
    },
    requireUser: createRequireUser(ports),
    /** Nomes dos usuários por id (para outros módulos exibirem quem é quem). */
    async findUserNames(ids: readonly string[]): Promise<Map<string, string>> {
      if (ids.length === 0) return new Map()
      const users = await ports.users.findNamesByIds(ids)
      return new Map(users.map((user) => [user.id, user.name]))
    },
  }
}

export type IdentityModule = ReturnType<typeof createIdentityModule>
