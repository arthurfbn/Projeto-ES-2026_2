import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  membershipErrorMessages,
  updateMembershipRequestSchema,
  updateShiftRequestSchema,
  type Membership,
  type MembershipListResponse,
  type MembershipResponse,
} from '@shavey/contracts'
import { parseBodyOrReply } from '../../../shared/http/validation'
import { listMemberships, updateMembership, updateShift, type MembershipView } from '../app/memberships'
import type { BarbershopPorts } from '../app/ports'
import { authorizeManager } from './authz'

const membershipParamsSchema = z.object({ membershipId: z.uuid() })

const notFound = {
  error: 'MEMBERSHIP_NOT_FOUND',
  message: membershipErrorMessages.MEMBERSHIP_NOT_FOUND,
} as const

const toBody = (view: MembershipView): Membership => ({ ...view, hiredAt: view.hiredAt.toISOString() })

export function registerMembershipRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }

  app.get('/barbershops/:barbershopId/memberships', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply

    const body: MembershipListResponse = { memberships: (await listMemberships(ports, barbershopId)).map(toBody) }
    return reply.send(body)
  })

  app.put('/barbershops/:barbershopId/memberships/:membershipId/shift', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const params = membershipParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)
    const input = parseBodyOrReply(updateShiftRequestSchema, request.body, reply)
    if (!input) return reply

    const result = await updateShift(ports, {
      barbershopId,
      membershipId: params.data.membershipId,
      windows: input.windows,
    })
    if (!result.ok) {
      if (result.error === 'MEMBERSHIP_NOT_FOUND') return reply.code(404).send(notFound)
      const message = membershipErrorMessages[result.error]
      // R21: conflito com o estado atual (disponibilidade) é 409; janela malformada é 400.
      const status = result.error === 'AVAILABILITY_OUTSIDE_SHIFT' ? 409 : 400
      return reply.code(status).send({ error: result.error, message, fields: { windows: message } })
    }
    const body: MembershipResponse = { membership: toBody(result.value) }
    return reply.send(body)
  })

  app.patch('/barbershops/:barbershopId/memberships/:membershipId', auth, async (request, reply) => {
    const barbershopId = await authorizeManager(ports.barbershops, request, reply)
    if (!barbershopId) return reply
    const params = membershipParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)
    const patch = parseBodyOrReply(updateMembershipRequestSchema, request.body, reply)
    if (!patch) return reply

    const result = await updateMembership(ports, { barbershopId, membershipId: params.data.membershipId, patch })
    if (!result.ok) {
      if (result.error === 'MEMBERSHIP_NOT_FOUND') return reply.code(404).send(notFound)
      return reply.code(409).send({ error: result.error, message: membershipErrorMessages[result.error] })
    }
    const body: MembershipResponse = { membership: toBody(result.value) }
    return reply.send(body)
  })
}
