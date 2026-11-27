import type { FastifyInstance, FastifyReply, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  availabilityErrorMessages,
  createAvailabilityRequestSchema,
  membershipErrorMessages,
  type AvailabilityListResponse,
  type AvailabilityResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import { createAvailability, listAvailabilities, removeAvailability } from '../app/availabilities'
import type { BarbershopPorts } from '../app/ports'

const membershipParamsSchema = z.object({ membershipId: z.uuid() })
const availabilityParamsSchema = z.object({ membershipId: z.uuid(), availabilityId: z.uuid() })

type ErrorCode = keyof typeof availabilityErrorMessages | 'MEMBERSHIP_NOT_FOUND'

const fieldOf: Partial<Record<ErrorCode, string>> = {
  INVALID_WINDOW: 'endMinute',
  INVALID_VALIDITY: 'validUntil',
  OUTSIDE_SHIFT: 'endMinute',
  OVERLAPPING_AVAILABILITY: 'endMinute',
}

function sendError(reply: FastifyReply, error: ErrorCode) {
  const message =
    error === 'MEMBERSHIP_NOT_FOUND' ? membershipErrorMessages.MEMBERSHIP_NOT_FOUND : availabilityErrorMessages[error]
  const field = fieldOf[error]
  const body = { error, message, ...(field ? { fields: { [field]: message } } : {}) }
  if (error === 'MEMBERSHIP_NOT_FOUND' || error === 'AVAILABILITY_NOT_FOUND') return reply.code(404).send(body)
  if (error === 'INVALID_WINDOW' || error === 'INVALID_VALIDITY') return reply.code(400).send(body)
  // Conflito com o estado atual: turno do vínculo, outra agenda ou vínculo inativo.
  return reply.code(409).send(body)
}

/**
 * R17–R20: disponibilidade do vínculo, só para o próprio barbeiro. Sem barbershopId na rota: o
 * dono é o usuário do vínculo (como a página do vínculo, ADR-0022).
 */
export function registerAvailabilityRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }
  const base = '/memberships/:membershipId/availability'

  app.get(base, auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = membershipParamsSchema.safeParse(request.params)
    if (!params.success) return sendError(reply, 'MEMBERSHIP_NOT_FOUND')

    const result = await listAvailabilities(ports, { membershipId: params.data.membershipId, userId: request.user.id })
    if (!result.ok) return sendError(reply, result.error)
    const body: AvailabilityListResponse = { availabilities: result.value }
    return reply.send(body)
  })

  app.post(base, auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = membershipParamsSchema.safeParse(request.params)
    if (!params.success) return sendError(reply, 'MEMBERSHIP_NOT_FOUND')
    const input = parseBodyOrReply(createAvailabilityRequestSchema, request.body, reply)
    if (!input) return reply

    const { validFrom, validUntil, ...window } = input
    const result = await createAvailability(ports, {
      membershipId: params.data.membershipId,
      userId: request.user.id,
      window,
      validity: { validFrom, validUntil },
    })
    if (!result.ok) return sendError(reply, result.error)
    const body: AvailabilityResponse = { availability: result.value }
    return reply.code(201).send(body)
  })

  app.delete(`${base}/:availabilityId`, auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = availabilityParamsSchema.safeParse(request.params)
    if (!params.success) return sendError(reply, 'AVAILABILITY_NOT_FOUND')

    const result = await removeAvailability(ports, { ...params.data, userId: request.user.id })
    if (!result.ok) return sendError(reply, result.error)
    return reply.code(204).send()
  })
}
