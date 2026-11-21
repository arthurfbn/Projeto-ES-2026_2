import { z } from 'zod'
import { emailSchema } from './auth'

/** Convite para entrar na barbearia como barbeiro (vínculo) ou gerente (spec 001, R10–R14; ADR-0018). */

export const INVITATION_KINDS = ['barber', 'manager'] as const
export const invitationKindSchema = z.enum(INVITATION_KINDS, 'Escolha barbeiro ou gerente.')

/** POST /barbershops/:barbershopId/invitations. `isExclusive` só vale para convite de barbeiro. */
export const createInvitationRequestSchema = z
  .object({
    email: emailSchema,
    kind: invitationKindSchema,
    isExclusive: z.boolean().default(false),
  })
  .strict()

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'canceled', 'expired'])

/** Resposta 201 do convite criado, para o gerente. */
export const sentInvitationResponseSchema = z.object({
  invitation: z.object({
    id: z.uuid(),
    kind: invitationKindSchema,
    isExclusive: z.boolean(),
    status: invitationStatusSchema,
    expiresAt: z.iso.datetime(),
  }),
})

export const receivedInvitationSchema = z.object({
  id: z.uuid(),
  barbershopId: z.uuid(),
  barbershopName: z.string(),
  kind: invitationKindSchema,
  isExclusive: z.boolean(),
  expiresAt: z.iso.datetime(),
})

/** GET /invitations: convites pendentes recebidos por quem está logado. */
export const receivedInvitationListResponseSchema = z.object({ invitations: z.array(receivedInvitationSchema) })

/** POST /invitations/:invitationId/accept: onde o convidado passou a ter o perfil. */
export const acceptInvitationResponseSchema = z.object({
  barbershopId: z.uuid(),
  kind: invitationKindSchema,
})

export const invitationErrorMessages = {
  USER_NOT_FOUND: 'Usuário não encontrado. Peça para a pessoa criar a conta no Shavey antes.',
  INVITATION_NOT_FOUND: 'Convite não encontrado.',
  INVITATION_NOT_PENDING: 'Este convite não está mais pendente.',
} as const

export type CreateInvitationRequest = z.input<typeof createInvitationRequestSchema>
export type InvitationKind = z.infer<typeof invitationKindSchema>
export type SentInvitationResponse = z.infer<typeof sentInvitationResponseSchema>
export type ReceivedInvitation = z.infer<typeof receivedInvitationSchema>
export type ReceivedInvitationListResponse = z.infer<typeof receivedInvitationListResponseSchema>
export type AcceptInvitationResponse = z.infer<typeof acceptInvitationResponseSchema>
