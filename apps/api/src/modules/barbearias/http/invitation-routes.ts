import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  acceptInvitationRequestSchema,
  createInvitationRequestSchema,
  invitationErrorMessages,
  type AcceptInvitationResponse,
  type LeaveConfirmationError,
  type ReceivedInvitationListResponse,
  type SentInvitationListResponse,
  type SentInvitationResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import {
  acceptInvitation,
  closeInvitation,
  inviteToBarbershop,
  listReceivedInvitations,
  listSentInvitations,
} from '../app/invitations'
import type { BarbershopPorts } from '../app/ports'
import { authorizeManager } from './authz'

const invitationParamsSchema = z.object({ invitationId: z.uuid() })

type ErrorCode = keyof typeof invitationErrorMessages

const errorBody = (error: ErrorCode) => ({ error, message: invitationErrorMessages[error] })

/** Convite inexistente ou de outra pessoa: 404 (não revela que existe). Os demais são conflito de estado. */
const statusFor = (error: ErrorCode) => (error === 'INVITATION_NOT_FOUND' ? 404 : 409)

export function registerInvitationRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }

  // R10, R11: só gerente da barbearia da rota convida.
  app.post('/barbershops/:barbershopId/invitations', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId || !request.user) return reply
    const input = parseBodyOrReply(createInvitationRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await inviteToBarbershop(ports, { ...input, barbershopId, invitedByUserId: request.user.id })
    if (!result.ok) {
      const message = invitationErrorMessages[result.error]
      const status = result.error === 'USER_NOT_FOUND' ? 422 : 409
      return reply.code(status).send({ error: result.error, message, fields: { email: message } })
    }
    const body: SentInvitationResponse = {
      invitation: { ...result.value, expiresAt: result.value.expiresAt.toISOString() },
    }
    return reply.code(201).send(body)
  })

  // R13: convites pendentes da barbearia, para o gerente cancelar.
  app.get('/barbershops/:barbershopId/invitations', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply

    const invitations = await listSentInvitations(ports, barbershopId)
    const body: SentInvitationListResponse = {
      invitations: invitations.map((invitation) => ({ ...invitation, expiresAt: invitation.expiresAt.toISOString() })),
    }
    return reply.send(body)
  })

  // R13: só gerente desta barbearia cancela, e só convite desta barbearia.
  app.post('/barbershops/:barbershopId/invitations/:invitationId/cancel', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId || !request.user) return reply
    const params = invitationParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(errorBody('INVITATION_NOT_FOUND'))

    const result = await closeInvitation(ports, {
      invitationId: params.data.invitationId,
      userId: request.user.id,
      as: 'manager',
      barbershopId,
    })
    if (!result.ok) return reply.code(statusFor(result.error)).send(errorBody(result.error))
    return reply.code(204).send()
  })

  // Sempre os convites de quem está logado: não há id de usuário na rota.
  app.get('/invitations', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const invitations = await listReceivedInvitations(ports, request.user.id)
    const body: ReceivedInvitationListResponse = {
      invitations: invitations.map((invitation) => ({ ...invitation, expiresAt: invitation.expiresAt.toISOString() })),
    }
    return reply.send(body)
  })

  // R13: só o convidado recusa.
  app.post('/invitations/:invitationId/decline', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = invitationParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(errorBody('INVITATION_NOT_FOUND'))

    const result = await closeInvitation(ports, {
      invitationId: params.data.invitationId,
      userId: request.user.id,
      as: 'invitee',
    })
    if (!result.ok) return reply.code(statusFor(result.error)).send(errorBody(result.error))
    return reply.code(204).send()
  })

  // R13–R14c: só o convidado aceita; convite exclusivo pede confirmar a saída das outras barbearias.
  app.post('/invitations/:invitationId/accept', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = invitationParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(errorBody('INVITATION_NOT_FOUND'))
    const input = parseBodyOrReply(acceptInvitationRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await acceptInvitation(ports, {
      invitationId: params.data.invitationId,
      userId: request.user.id,
      confirmLeave: input.confirmLeave,
    })
    if (!result.ok) {
      if (result.error === 'LEAVE_CONFIRMATION_REQUIRED') {
        const body: LeaveConfirmationError = { ...errorBody(result.error), error: result.error, barbershops: result.leaving }
        return reply.code(409).send(body)
      }
      return reply.code(statusFor(result.error)).send(errorBody(result.error))
    }
    const body: AcceptInvitationResponse = result.value
    return reply.send(body)
  })
}
