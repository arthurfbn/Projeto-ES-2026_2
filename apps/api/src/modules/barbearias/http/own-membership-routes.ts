import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import { membershipErrorMessages, type OwnMembershipResponse } from '@shavey/contracts'
import { getOwnMembership } from '../app/own-membership'
import type { BarbershopPorts } from '../app/ports'

const paramsSchema = z.object({ membershipId: z.uuid() })

const notFound = { error: 'MEMBERSHIP_NOT_FOUND', message: membershipErrorMessages.MEMBERSHIP_NOT_FOUND } as const

/** Página do vínculo, vista pelo próprio barbeiro (ADR-0022). Sem barbershopId na rota: o dono é o usuário. */
export function registerOwnMembershipRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  app.get('/memberships/:membershipId', { preHandler: requireUser }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)

    const result = await getOwnMembership(ports, { membershipId: params.data.membershipId, userId: request.user.id })
    if (!result.ok) return reply.code(404).send(notFound)

    const body: OwnMembershipResponse = {
      membership: { ...result.value, hiredAt: result.value.hiredAt.toISOString() },
    }
    return reply.send(body)
  })
}
