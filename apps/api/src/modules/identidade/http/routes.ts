import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { authErrorMessages, loginRequestSchema, signupRequestSchema } from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import type { IdentityPorts } from '../app/ports'
import { currentUser, describeMe, logIn, logOut, signUp, type AuthUser, type SessionStart } from '../app/use-cases'

export const SESSION_COOKIE = 'shavey_session'

export type AuthRateLimit = { max: number; timeWindow: string }

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido por `requireUser`; null nas rotas públicas. */
    user: AuthUser | null
  }
}

function setSessionCookie(reply: FastifyReply, session: SessionStart) {
  // ADR-0006: httpOnly + Secure + SameSite=Lax, sem Domain. Navegadores aceitam Secure em localhost.
  reply.setCookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  })
}


/** preHandler das rotas autenticadas: 401 sem sessão válida; senão `request.user` fica preenchido. */
export function createRequireUser(ports: IdentityPorts) {
  return async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[SESSION_COOKIE]
    const user = token ? await currentUser(ports, token) : null
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      return reply.code(401).send({ error: 'UNAUTHENTICATED', message: 'Entre na sua conta para continuar.' })
    }
    request.user = user
  }
}

export function registerIdentityRoutes(
  app: FastifyInstance,
  ports: IdentityPorts,
  rateLimit: AuthRateLimit,
): void {
  const requireUser = createRequireUser(ports)
  const limited = { config: { rateLimit } }

  app.post('/auth/signup', limited, async (request, reply) => {
    const input = parseBodyOrReply(signupRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await signUp(ports, input)
    if (!result.ok) {
      const message = authErrorMessages.EMAIL_TAKEN
      return reply.code(409).send({ error: result.error, message, fields: { email: message } })
    }
    setSessionCookie(reply, result.value)
    return reply.code(201).send(await describeMe(ports, result.value.user))
  })

  app.post('/auth/login', limited, async (request, reply) => {
    const input = parseBodyOrReply(loginRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await logIn(ports, { ...input, previousToken: request.cookies[SESSION_COOKIE] })
    if (!result.ok) {
      return reply.code(401).send({ error: result.error, message: authErrorMessages.INVALID_CREDENTIALS })
    }
    setSessionCookie(reply, result.value)
    return reply.send(await describeMe(ports, result.value.user))
  })

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await logOut(ports, token)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return reply.code(204).send()
  })

  app.get('/me', { preHandler: requireUser }, async (request, reply) => {
    // requireUser garante o usuário; a checagem satisfaz o tipo sem asserção.
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    return reply.send(await describeMe(ports, request.user))
  })
}
