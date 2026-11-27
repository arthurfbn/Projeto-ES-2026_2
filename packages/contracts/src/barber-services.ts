import { z } from 'zod'
import { durationMinutesSchema, priceCentsSchema } from './services'

/**
 * Serviço do barbeiro (spec 001, R16): quais serviços da barbearia o barbeiro realiza, com preço
 * e duração próprios opcionais. null = vale o padrão do serviço.
 */

/** PUT /barbershops/:barbershopId/memberships/:membershipId/services/:serviceId (atribui ou altera). */
export const setBarberServiceRequestSchema = z
  .object({
    priceCents: priceCentsSchema.nullable().default(null),
    durationMinutes: durationMinutesSchema.nullable().default(null),
  })
  .strict()

export const barberServiceSchema = z.object({
  serviceId: z.uuid(),
  name: z.string(),
  /** Serviço desativado continua listado no barbeiro, marcado (não aparece para novos agendamentos). */
  serviceIsActive: z.boolean(),
  /** Próprios do barbeiro; null = padrão. */
  priceCents: z.number().int().nullable(),
  durationMinutes: z.number().int().nullable(),
  /** O que vale para o barbeiro: o próprio ou o padrão (CA15). */
  effectivePriceCents: z.number().int(),
  effectiveDurationMinutes: z.number().int(),
})

/** GET …/memberships/:membershipId/services (visão do gerente). */
export const barberServiceListResponseSchema = z.object({ services: z.array(barberServiceSchema) })

/** PUT …/services/:serviceId. */
export const barberServiceResponseSchema = z.object({ service: barberServiceSchema })

export const barberServiceErrorMessages = {
  SERVICE_INACTIVE: 'Serviço desativado não pode ser atribuído a barbeiro.',
  SERVICE_NOT_FOUND: 'Serviço não encontrado.',
  BARBER_SERVICE_NOT_FOUND: 'Este barbeiro não realiza esse serviço.',
} as const

export type SetBarberServiceRequest = z.input<typeof setBarberServiceRequestSchema>
export type BarberService = z.infer<typeof barberServiceSchema>
export type BarberServiceListResponse = z.infer<typeof barberServiceListResponseSchema>
export type BarberServiceResponse = z.infer<typeof barberServiceResponseSchema>
