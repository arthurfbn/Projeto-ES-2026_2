import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { barbershopErrorMessages, serviceErrorMessages } from '@shavey/contracts'
import type { BarbershopRepository } from '../app/ports'

const barbershopParamsSchema = z.object({ barbershopId: z.uuid() })

/**
 * Único ponto que decide se quem chama gerencia a barbearia da rota (skill seguranca-authz).
 * O barbershopId vem sempre da URL. Devolve o id autorizado, ou null depois de já ter respondido:
 * 401 sem usuário, 404 para id malformado, 403 para quem não é gerente dela (spec 001, CA4 e CA8).
 */
export async function authorizeManager(
  barbershops: BarbershopRepository,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  if (!request.user) {
    await reply.code(401).send({ error: 'UNAUTHENTICATED' })
    return null
  }
  const params = barbershopParamsSchema.safeParse(request.params)
  if (!params.success) {
    await reply.code(404).send({ error: 'BARBERSHOP_NOT_FOUND', message: barbershopErrorMessages.BARBERSHOP_NOT_FOUND })
    return null
  }
  const roles = await barbershops.findRoles(params.data.barbershopId, request.user.id)
  if (!roles.manager) {
    await reply.code(403).send({ error: 'NOT_A_MANAGER', message: serviceErrorMessages.NOT_A_MANAGER })
    return null
  }
  return params.data.barbershopId
}
