import { z } from 'zod'

/**
 * Serviço da barbearia (spec 001, R9): preço padrão em centavos e duração padrão em minutos.
 * A mesma regra vive no core da API (checkServiceTerms); aqui ela dá o erro no campo.
 */

export const SERVICE_DURATION_STEP_MINUTES = 15

export const priceCentsSchema = z
  .number()
  .refine((value) => Number.isInteger(value) && value > 0, 'Informe um preço maior que zero.')

export const durationMinutesSchema = z
  .number()
  .refine(
    (value) =>
      Number.isInteger(value) && value >= SERVICE_DURATION_STEP_MINUTES && value % SERVICE_DURATION_STEP_MINUTES === 0,
    'A duração precisa ser de 15 em 15 minutos (mínimo 15).',
  )

const serviceNameSchema = z.string().trim().min(1, 'Informe o nome do serviço.').max(80, 'Nome longo demais.')

export const createServiceRequestSchema = z
  .object({
    name: serviceNameSchema,
    priceCents: priceCentsSchema,
    durationMinutes: durationMinutesSchema,
  })
  .strict()

/** Edição parcial: nome, preço, duração ou ativo/inativo (serviço nunca é excluído). */
export const updateServiceRequestSchema = z
  .object({
    name: serviceNameSchema.optional(),
    priceCents: priceCentsSchema.optional(),
    durationMinutes: durationMinutesSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, 'Informe o que mudou.')

export const serviceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  priceCents: z.number().int(),
  durationMinutes: z.number().int(),
  isActive: z.boolean(),
})

/** GET /barbershops/:barbershopId/services: todos, ativos e inativos (visão do gerente). */
export const serviceListResponseSchema = z.object({ services: z.array(serviceSchema) })

/** POST (201) e PATCH de /barbershops/:barbershopId/services. */
export const serviceResponseSchema = z.object({ service: serviceSchema })

export const serviceErrorMessages = {
  NOT_A_MANAGER: 'Só gerentes desta barbearia podem mexer nos serviços.',
  SERVICE_NOT_FOUND: 'Serviço não encontrado.',
} as const

export type CreateServiceRequest = z.input<typeof createServiceRequestSchema>
export type UpdateServiceRequest = z.input<typeof updateServiceRequestSchema>
export type Service = z.infer<typeof serviceSchema>
export type ServiceListResponse = z.infer<typeof serviceListResponseSchema>
export type ServiceResponse = z.infer<typeof serviceResponseSchema>
