import { z } from 'zod'

/**
 * Disponibilidade do barbeiro (spec 001, R17–R20): janela semanal (dia 0 = domingo … 6 = sábado,
 * minutos do dia em hora de São Paulo, de 15 em 15) com vigência em datas de São Paulo
 * (AAAA-MM-DD, inclusivas; sem fim = vale daqui em diante).
 */

const windowMessage = 'Confira os horários: início antes do fim, de 15 em 15 minutos.'

const minuteOfDay = z
  .number()
  .refine((value) => Number.isInteger(value) && value >= 0 && value <= 24 * 60 && value % 15 === 0, windowMessage)

const dateSchema = z.iso.date('Informe uma data válida.')

/** POST /memberships/:membershipId/availability (só o próprio barbeiro). */
export const createAvailabilityRequestSchema = z
  .object({
    weekday: z.number().refine((value) => Number.isInteger(value) && value >= 0 && value <= 6, 'Escolha o dia.'),
    startMinute: minuteOfDay,
    endMinute: minuteOfDay,
    validFrom: dateSchema,
    validUntil: dateSchema.nullable().default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startMinute >= value.endMinute) {
      ctx.addIssue({ code: 'custom', path: ['endMinute'], message: windowMessage })
    }
    if (value.validUntil !== null && value.validUntil < value.validFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'O fim da vigência precisa ser no início ou depois dele.',
      })
    }
  })

export const availabilitySchema = z.object({
  id: z.uuid(),
  weekday: z.number().int(),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
  validFrom: z.string(),
  validUntil: z.string().nullable(),
})

/** GET /memberships/:membershipId/availability. */
export const availabilityListResponseSchema = z.object({ availabilities: z.array(availabilitySchema) })

/** POST (201). */
export const availabilityResponseSchema = z.object({ availability: availabilitySchema })

export const availabilityErrorMessages = {
  MEMBERSHIP_INACTIVE: 'Este vínculo está inativo: não dá para abrir agenda nele.',
  INVALID_WINDOW: windowMessage,
  INVALID_VALIDITY: 'O fim da vigência precisa ser no início ou depois dele.',
  OUTSIDE_SHIFT: 'Fora do turno permitido pelo gerente.',
  OVERLAPPING_AVAILABILITY: 'Você já atende nesse horário, nesta ou em outra barbearia.',
  AVAILABILITY_NOT_FOUND: 'Disponibilidade não encontrada.',
} as const

export type CreateAvailabilityRequest = z.input<typeof createAvailabilityRequestSchema>
export type Availability = z.infer<typeof availabilitySchema>
export type AvailabilityListResponse = z.infer<typeof availabilityListResponseSchema>
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>
