import { z } from 'zod'

/**
 * Vínculo e turno permitido (spec 001, R15, R21; ADR-0019). Janelas semanais em dia da semana
 * (0 = domingo … 6 = sábado) e minutos do dia (hora de relógio em São Paulo), de 15 em 15.
 */

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

const windowMessage = 'Confira os horários: início antes do fim, de 15 em 15 minutos.'

const minuteOfDay = z
  .number()
  .refine((value) => Number.isInteger(value) && value >= 0 && value <= 24 * 60 && value % 15 === 0, windowMessage)

export const weeklyWindowSchema = z
  .object({
    weekday: z.number().refine((value) => Number.isInteger(value) && value >= 0 && value <= 6, windowMessage),
    startMinute: minuteOfDay,
    endMinute: minuteOfDay,
  })
  .strict()
  .refine((window) => window.startMinute < window.endMinute, windowMessage)

/** PUT …/shift: substitui o turno inteiro; lista vazia = vínculo sem turno. */
export const updateShiftRequestSchema = z
  .object({
    windows: z.array(weeklyWindowSchema, { error: windowMessage }).max(28, 'Janelas demais.'),
  })
  .strict()

/** PATCH …/memberships/:membershipId: o que o gerente ajusta no vínculo além do turno. */
export const updateMembershipRequestSchema = z
  .object({
    acceptsAppointments: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, 'Informe o que mudou.')

export const membershipSchema = z.object({
  id: z.uuid(),
  barber: z.object({ id: z.uuid(), name: z.string() }),
  /** Data de contratação (ISO 8601, UTC). */
  hiredAt: z.iso.datetime(),
  isExclusive: z.boolean(),
  acceptsAppointments: z.boolean(),
  isActive: z.boolean(),
  /** Turno permitido; vazio = sem turno. */
  shift: z.array(weeklyWindowSchema),
})

/** GET /barbershops/:barbershopId/memberships (visão do gerente). */
export const membershipListResponseSchema = z.object({ memberships: z.array(membershipSchema) })

/** PATCH do vínculo e PUT do turno. */
export const membershipResponseSchema = z.object({ membership: membershipSchema })

export const membershipErrorMessages = {
  MEMBERSHIP_NOT_FOUND: 'Vínculo não encontrado.',
  OVERLAPPING_WINDOWS: 'As janelas do turno se sobrepõem no mesmo dia.',
  INVALID_WINDOW: windowMessage,
  AVAILABILITY_OUTSIDE_SHIFT: 'Há disponibilidade fora do novo turno.',
  EXCLUSIVITY_CONFLICT: 'Este barbeiro tem vínculo exclusivo que impede reativar este vínculo.',
} as const

export type WeeklyWindow = z.infer<typeof weeklyWindowSchema>
export type UpdateShiftRequest = z.input<typeof updateShiftRequestSchema>
export type UpdateMembershipRequest = z.input<typeof updateMembershipRequestSchema>
export type Membership = z.infer<typeof membershipSchema>
export type MembershipListResponse = z.infer<typeof membershipListResponseSchema>
export type MembershipResponse = z.infer<typeof membershipResponseSchema>
