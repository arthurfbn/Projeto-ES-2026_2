import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import {
  barbershopErrorMessages,
  barbershopSearchQuerySchema,
  type BarbershopPageResponse,
  type BarbershopSearchResponse,
  type PlatformServicesResponse,
} from '@shavey/contracts'
import { getBarbershopPage, listPlatformServices, searchBookableBarbershops } from '../app/discovery'
import type { BarbershopPorts } from '../app/ports'

const paramsSchema = z.object({ barbershopId: z.uuid() })
const notFound = { error: 'BARBERSHOP_NOT_FOUND', message: barbershopErrorMessages.BARBERSHOP_NOT_FOUND } as const

/** R1–R3: busca, chips e página da barbearia, só para quem entrou (ADR-0022). */
export function registerDiscoveryRoutes(
  app: FastifyInstance,
  ports: BarbershopPorts,
  requireUser: preHandlerAsyncHookHandler,
): void {
  const auth = { preHandler: requireUser }

  app.get('/barbershops/search', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const query = barbershopSearchQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Digite o que procura ou escolha um serviço.' })
    }

    const found = await searchBookableBarbershops(ports, { q: query.data.q, serviceKey: query.data.service })
    const body: BarbershopSearchResponse = {
      barbershops: found.map(({ id, name, neighborhood, city, state }) => ({ id, name, neighborhood, city, state })),
    }
    return reply.send(body)
  })

  app.get('/platform-services', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const body: PlatformServicesResponse = { services: await listPlatformServices(ports) }
    return reply.send(body)
  })

  app.get('/barbershops/:barbershopId/page', auth, async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) return reply.code(404).send(notFound)

    const result = await getBarbershopPage(ports, params.data.barbershopId)
    if (!result.ok) return reply.code(404).send(notFound)
    const body: BarbershopPageResponse = result.value
    return reply.send(body)
  })
}
