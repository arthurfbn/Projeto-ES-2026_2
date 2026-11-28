import { z } from 'zod'

/**
 * Horários livres (spec 003, R5–R8; ADR-0023). Data do calendário de São Paulo (AAAA-MM-DD).
 * Sem `membershipId` = "qualquer barbeiro": cada horário já traz quem seria atribuído.
 */

/** GET /barbershops/:barbershopId/services/:serviceId/slots?date=…&membershipId=… */
export const slotsQuerySchema = z
  .object({
    date: z.iso.date('Informe uma data válida.'),
    membershipId: z.uuid().optional(),
  })
  .strict()

export const slotBarberSchema = z.object({
  membershipId: z.uuid(),
  name: z.string(),
  priceCents: z.number().int(),
  durationMinutes: z.number().int(),
})

export const slotSchema = z.object({
  /** Instante ISO 8601 em UTC; a tela mostra em America/Sao_Paulo. */
  startsAt: z.iso.datetime(),
  barber: slotBarberSchema,
})

export const slotsResponseSchema = z.object({
  date: z.string(),
  slots: z.array(slotSchema),
  /** Menor preço entre os barbeiros com horário no dia; null sem horário. */
  fromPriceCents: z.number().int().nullable(),
  /** Preços diferentes: a lista mostra "a partir de R$ X". */
  pricesDiffer: z.boolean(),
})

export const slotErrorMessages = {
  SERVICE_NOT_FOUND: 'Serviço não encontrado.',
} as const

export type SlotsQuery = z.input<typeof slotsQuerySchema>
export type SlotBarber = z.infer<typeof slotBarberSchema>
export type Slot = z.infer<typeof slotSchema>
export type SlotsResponse = z.infer<typeof slotsResponseSchema>
