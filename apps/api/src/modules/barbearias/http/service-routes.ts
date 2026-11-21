import type { FastifyInstance, FastifyReply, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  createServiceRequestSchema,
  serviceErrorMessages,
  updateServiceRequestSchema,
  type ServiceListResponse,
  type ServiceResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import type { BarbershopPorts } from '../app/ports'
import { createService, listServices, updateService } from '../app/services'
import { authorizeManager } from './authz'

const serviceParamsSchema = z.object({ serviceId: z.uuid() })

const notFound = { error: 'SERVICE_NOT_FOUND', message: serviceErrorMessages.SERVICE_NOT_FOUND } as const

/** O contrato já barra preço e duração inválidos; isto cobre quem chegar ao core por outro caminho. */
const termsErrorFields = {
  INVALID_PRICE: { priceCents: 'Informe um preço maior que zero.' },
  INVALID_DURATION: { durationMinutes: 'A duração precisa ser de 15 em 15 minutos (mínimo 15).' },
} as const

function sendTermsError(reply: FastifyReply, error: keyof typeof termsErrorFields) {
  return reply.code(400).send({ error, message: 'Confira os campos destacados.', fields: termsErrorFields[error] })
}

export function registerServiceRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }

  app.get('/barbershops/:barbershopId/services', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply

    const body: ServiceListResponse = { services: await listServices(ports, barbershopId) }
    return reply.send(body)
  })

  app.post('/barbershops/:barbershopId/services', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const service = parseBodyOrReply(createServiceRequestSchema, request.body, reply)
    if (!service) return reply

    const result = await createService(ports, { barbershopId, service })
    if (!result.ok) return sendTermsError(reply, result.error)
    const body: ServiceResponse = { service: result.value }
    return reply.code(201).send(body)
  })

  app.patch('/barbershops/:barbershopId/services/:serviceId', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const params = serviceParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)
    const patch = parseBodyOrReply(updateServiceRequestSchema, request.body, reply)
    if (!patch) return reply

    const result = await updateService(ports, { barbershopId, serviceId: params.data.serviceId, patch })
    if (!result.ok) {
      if (result.error === 'SERVICE_NOT_FOUND') return reply.code(404).send(notFound)
      return sendTermsError(reply, result.error)
    }
    const body: ServiceResponse = { service: result.value }
    return reply.send(body)
  })
}
