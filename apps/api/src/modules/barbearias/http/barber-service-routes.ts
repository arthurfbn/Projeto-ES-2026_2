import type { FastifyInstance, FastifyReply, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  barberServiceErrorMessages,
  membershipErrorMessages,
  setBarberServiceRequestSchema,
  type BarberServiceListResponse,
  type BarberServiceResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import { listBarberServices, removeBarberService, setBarberService } from '../app/barber-services'
import type { BarbershopPorts } from '../app/ports'
import { authorizeManager } from './authz'

const membershipParamsSchema = z.object({ membershipId: z.uuid() })
const serviceParamsSchema = z.object({ membershipId: z.uuid(), serviceId: z.uuid() })

type ErrorCode =
  | 'MEMBERSHIP_NOT_FOUND'
  | 'SERVICE_NOT_FOUND'
  | 'BARBER_SERVICE_NOT_FOUND'
  | 'SERVICE_INACTIVE'
  | 'INVALID_PRICE'
  | 'INVALID_DURATION'

const messages: Record<ErrorCode, string> = {
  MEMBERSHIP_NOT_FOUND: membershipErrorMessages.MEMBERSHIP_NOT_FOUND,
  ...barberServiceErrorMessages,
  INVALID_PRICE: 'Informe um preço maior que zero.',
  INVALID_DURATION: 'A duração precisa ser de 15 em 15 minutos (mínimo 15).',
}

function sendError(reply: FastifyReply, error: ErrorCode) {
  const message = messages[error]
  if (error === 'INVALID_PRICE') return reply.code(400).send({ error, message, fields: { priceCents: message } })
  if (error === 'INVALID_DURATION') return reply.code(400).send({ error, message, fields: { durationMinutes: message } })
  if (error === 'SERVICE_INACTIVE') return reply.code(409).send({ error, message })
  return reply.code(404).send({ error, message })
}

/** R16: serviços do barbeiro, só para gerente da barbearia (403 para os demais). */
export function registerBarberServiceRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }
  const base = '/barbershops/:barbershopId/memberships/:membershipId/services'

  app.get(base, auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const params = membershipParamsSchema.safeParse(request.params)
    if (!params.success) return sendError(reply, 'MEMBERSHIP_NOT_FOUND')

    const result = await listBarberServices(ports, { barbershopId, membershipId: params.data.membershipId })
    if (!result.ok) return sendError(reply, result.error)
    const body: BarberServiceListResponse = { services: result.value }
    return reply.send(body)
  })

  app.put(`${base}/:serviceId`, auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const params = serviceParamsSchema.safeParse(request.params)
    if (!params.success) return sendError(reply, 'SERVICE_NOT_FOUND')
    const own = parseBodyOrReply(setBarberServiceRequestSchema, request.body, reply)
    if (!own) return reply

    const result = await setBarberService(ports, { barbershopId, ...params.data, own })
    if (!result.ok) return sendError(reply, result.error)
    const body: BarberServiceResponse = { service: result.value }
    return reply.send(body)
  })

  app.delete(`${base}/:serviceId`, auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const params = serviceParamsSchema.safeParse(request.params)
    if (!params.success) return sendError(reply, 'BARBER_SERVICE_NOT_FOUND')

    const result = await removeBarberService(ports, { barbershopId, ...params.data })
    if (!result.ok) return sendError(reply, result.error)
    return reply.code(204).send()
  })
}
