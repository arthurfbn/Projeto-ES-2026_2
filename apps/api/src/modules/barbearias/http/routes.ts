import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  barbershopErrorMessages,
  createBarbershopRequestSchema,
  type BarbershopResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import type { BarbershopPorts } from '../app/ports'
import { createBarbershop, getBarbershop, type BarbershopView } from '../app/use-cases'

const paramsSchema = z.object({ barbershopId: z.uuid() })

const notFound = {
  error: 'BARBERSHOP_NOT_FOUND',
  message: barbershopErrorMessages.BARBERSHOP_NOT_FOUND,
} as const

const responseBody = ({ barbershop, roles }: BarbershopView): BarbershopResponse => ({ barbershop, roles })

export function registerBarbershopRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  app.post('/barbershops', { preHandler: requireUser }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const input = parseBodyOrReply(createBarbershopRequestSchema, request.body, reply)
    if (!input) return reply

    const { alsoBarber, ...barbershop } = input
    const result = await createBarbershop(ports, { creatorId: request.user.id, alsoBarber, barbershop })
    if (!result.ok) {
      const message = barbershopErrorMessages[result.error]
      return reply.code(409).send({ error: result.error, message, fields: { alsoBarber: message } })
    }
    return reply.code(201).send(responseBody(result.value))
  })

  app.get('/barbershops/:barbershopId', { preHandler: requireUser }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    // barbershopId vem da rota e é checado contra os perfis do usuário (skill seguranca-authz).
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)

    const result = await getBarbershop(ports, { barbershopId: params.data.barbershopId, userId: request.user.id })
    if (!result.ok) return reply.code(404).send(notFound)
    return reply.send(responseBody(result.value))
  })
}
