import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  createInvitationRequestSchema,
  invitationErrorMessages,
  type AcceptInvitationResponse,
  type ReceivedInvitationListResponse,
  type SentInvitationResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import { acceptInvitation, inviteToBarbershop, listReceivedInvitations } from '../app/invitations'
import type { BarbershopPorts } from '../app/ports'
import { authorizeManager } from './authz'

const invitationParamsSchema = z.object({ invitationId: z.uuid() })

const errorBody = (error: keyof typeof invitationErrorMessages) => ({ error, message: invitationErrorMessages[error] })

export function registerInvitationRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }

  // R10: só gerente da barbearia da rota convida.
  app.post('/barbershops/:barbershopId/invitations', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId || !request.user) return reply
    const input = parseBodyOrReply(createInvitationRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await inviteToBarbershop(ports, { ...input, barbershopId, invitedByUserId: request.user.id })
    if (!result.ok) {
      const message = invitationErrorMessages[result.error]
      return reply.code(422).send({ error: result.error, message, fields: { email: message } })
    }
    const body: SentInvitationResponse = {
      invitation: { ...result.value, expiresAt: result.value.expiresAt.toISOString() },
    }
    return reply.code(201).send(body)
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

  // R13: só o convidado aceita; convite de outra pessoa responde 404 (não revela que existe).
  app.post('/invitations/:invitationId/accept', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = invitationParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(errorBody('INVITATION_NOT_FOUND'))

    const result = await acceptInvitation(ports, { invitationId: params.data.invitationId, userId: request.user.id })
    if (!result.ok) {
      const status = result.error === 'INVITATION_NOT_FOUND' ? 404 : 409
      return reply.code(status).send(errorBody(result.error))
    }
    const body: AcceptInvitationResponse = result.value
    return reply.send(body)
  })
}
