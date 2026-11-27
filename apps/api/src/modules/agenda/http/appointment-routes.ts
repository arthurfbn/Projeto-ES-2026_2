import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  appointmentErrorMessages,
  createAppointmentRequestSchema,
  type AppointmentResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import { bookAppointment } from '../app/booking'
import type { AgendaPorts } from '../app/ports'

const paramsSchema = z.object({ barbershopId: z.uuid() })

/** R9–R11: o cliente que entrou agenda um horário livre (ADR-0022). */
export function registerAppointmentRoutes(
  app: FastifyInstance,
  ports: AgendaPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  app.post('/barbershops/:barbershopId/appointments', { preHandler: requireUser }, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const notFound = { error: 'SERVICE_NOT_FOUND', message: appointmentErrorMessages.SERVICE_NOT_FOUND }
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)
    const input = parseBodyOrReply(createAppointmentRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await bookAppointment(ports, {
      ...input,
      barbershopId: params.data.barbershopId,
      clientUserId: request.user.id,
      startsAt: new Date(input.startsAt),
    })
    if (!result.ok) {
      if (result.error === 'SERVICE_NOT_FOUND') return reply.code(404).send(notFound)
      return reply.code(409).send({ error: result.error, message: appointmentErrorMessages[result.error] })
    }

    const appointment = result.value
    const body: AppointmentResponse = {
      appointment: {
        id: appointment.id,
        barbershopId: appointment.barbershopId,
        serviceId: appointment.serviceId,
        barber: { membershipId: appointment.membershipId, name: appointment.barberName },
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        priceCents: appointment.priceCents,
        durationMinutes: appointment.durationMinutes,
        paymentMethod: appointment.paymentMethod,
        status: appointment.status,
      },
    }
    return reply.code(201).send(body)
  })
}
