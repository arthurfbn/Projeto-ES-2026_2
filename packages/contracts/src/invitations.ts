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

/**
 * POST /invitations/:invitationId/accept. `confirmLeave`: o convidado confirma sair das outras
 * barbearias ao aceitar um convite exclusivo (R14c). Corpo vazio vale como `false`.
 */
export const acceptInvitationRequestSchema = z.object({ confirmLeave: z.boolean().default(false) }).strict()

/** Resposta do aceite: onde o convidado passou a ter o perfil. */
export const acceptInvitationResponseSchema = z.object({
  barbershopId: z.uuid(),
  kind: invitationKindSchema,
})

/** 409 do aceite exclusivo sem confirmação (R14c): de quais barbearias o barbeiro sairia. */
export const leaveConfirmationErrorSchema = z.object({
  error: z.literal('LEAVE_CONFIRMATION_REQUIRED'),
  message: z.string(),
  barbershops: z.array(z.object({ id: z.uuid(), name: z.string() })),
})

/** GET /barbershops/:barbershopId/invitations: convites pendentes enviados (visão do gerente). */
export const sentInvitationListResponseSchema = z.object({
  invitations: z.array(
    z.object({
      id: z.uuid(),
      invitee: z.object({ name: z.string() }),
      kind: invitationKindSchema,
      isExclusive: z.boolean(),
      expiresAt: z.iso.datetime(),
    }),
  ),
})

export const invitationErrorMessages = {
  USER_NOT_FOUND: 'Usuário não encontrado. Peça para a pessoa criar a conta no Shavey antes.',
  ALREADY_INVITED: 'Esta pessoa já tem um convite pendente deste tipo aqui.',
  ALREADY_MANAGER: 'Esta pessoa já é gerente desta barbearia.',
  ALREADY_BARBER: 'Esta pessoa já tem vínculo de barbeiro ativo aqui.',
  INACTIVE_MEMBERSHIP: 'Esta pessoa já tem vínculo (inativo) aqui. Reative o vínculo em Equipe.',
  INVITATION_NOT_FOUND: 'Convite não encontrado.',
  INVITATION_NOT_PENDING: 'Este convite não está mais pendente.',
  INVITATION_EXPIRED: 'Este convite expirou. Peça um novo convite ao gerente.',
  EXCLUSIVE_MEMBERSHIP_ELSEWHERE:
    'Você tem vínculo exclusivo com outra barbearia, então não pode aceitar vínculo aqui.',
  LEAVE_CONFIRMATION_REQUIRED: 'Este vínculo é exclusivo: para aceitar, você sai das outras barbearias.',
} as const

export type CreateInvitationRequest = z.input<typeof createInvitationRequestSchema>
export type InvitationKind = z.infer<typeof invitationKindSchema>
export type SentInvitationResponse = z.infer<typeof sentInvitationResponseSchema>
export type ReceivedInvitation = z.infer<typeof receivedInvitationSchema>
export type ReceivedInvitationListResponse = z.infer<typeof receivedInvitationListResponseSchema>
export type AcceptInvitationResponse = z.infer<typeof acceptInvitationResponseSchema>
export type AcceptInvitationRequest = z.input<typeof acceptInvitationRequestSchema>
export type LeaveConfirmationError = z.infer<typeof leaveConfirmationErrorSchema>
export type SentInvitationListResponse = z.infer<typeof sentInvitationListResponseSchema>
export type SentInvitation = SentInvitationListResponse['invitations'][number]
