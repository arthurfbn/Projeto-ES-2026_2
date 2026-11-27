import { z } from 'zod'

/**
 * Agendamento (spec 003, R9–R11; ADR-0013). Preço e duração congelados no momento de agendar.
 * Nesta fatia só se paga no local; o online entra com o Stripe (#49).
 */

export const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
export const paymentMethodSchema = z.enum(['online', 'on_site'])

/** POST /barbershops/:barbershopId/appointments. Sem `membershipId` = "qualquer barbeiro". */
export const createAppointmentRequestSchema = z
  .object({
    serviceId: z.uuid('Escolha o serviço.'),
    membershipId: z.uuid().optional(),
    startsAt: z.iso.datetime({ offset: true, message: 'Escolha o horário.' }),
    paymentMethod: z.literal('on_site', 'Por enquanto, só pagamento no local.'),
  })
  .strict()

export const appointmentSchema = z.object({
  id: z.uuid(),
  barbershopId: z.uuid(),
  serviceId: z.uuid(),
  barber: z.object({ membershipId: z.uuid(), name: z.string() }),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  priceCents: z.number().int(),
  durationMinutes: z.number().int(),
  paymentMethod: paymentMethodSchema,
  status: appointmentStatusSchema,
})

export const appointmentResponseSchema = z.object({ appointment: appointmentSchema })

export const appointmentErrorMessages = {
  SERVICE_NOT_FOUND: 'Serviço não encontrado.',
  SLOT_NOT_AVAILABLE: 'Esse horário não está mais livre. Escolha outro.',
} as const

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type CreateAppointmentRequest = z.input<typeof createAppointmentRequestSchema>
export type Appointment = z.infer<typeof appointmentSchema>
export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>
