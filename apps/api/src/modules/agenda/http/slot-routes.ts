import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import { slotErrorMessages, slotsQuerySchema, type SlotsResponse } from '@shavey/contracts'
import { listSlots } from '../app/slots'
import type { AgendaPorts } from '../app/ports'

const paramsSchema = z.object({ barbershopId: z.uuid(), serviceId: z.uuid() })

/** R5–R8: horários livres, só para quem entrou (ADR-0022). */
export function registerSlotRoutes(
  app: FastifyInstance,
  ports: AgendaPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  app.get('/barbershops/:barbershopId/services/:serviceId/slots', { preHandler: requireUser }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const notFound = { error: 'SERVICE_NOT_FOUND', message: slotErrorMessages.SERVICE_NOT_FOUND }
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)
    const query = slotsQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Confira a data e o barbeiro.' })
    }

    const result = await listSlots(ports, { ...params.data, ...query.data })
    if (!result.ok) return reply.code(404).send(notFound)

    const body: SlotsResponse = {
      date: query.data.date,
      slots: result.value.slots.map(({ startsAt, barber }) => ({ startsAt: startsAt.toISOString(), barber })),
      fromPriceCents: result.value.fromPriceCents,
      pricesDiffer: result.value.pricesDiffer,
    }
    return reply.send(body)
  })
}
