import type { FastifyReply } from 'fastify'
import { fieldErrors } from '@shavey/contracts'
import type { z } from 'zod'

/**
 * Valida o corpo com o contrato (borda da API). Em caso de erro já responde 400 com os erros
 * por campo e devolve undefined; a rota só segue com dados válidos.
 */
export function parseBodyOrReply<S extends z.ZodType>(
  schema: S,
  body: unknown,
  reply: FastifyReply,
): z.infer<S> | undefined {
  const parsed = schema.safeParse(body ?? {})
  if (parsed.success) return parsed.data
  void reply.code(400).send({
    error: 'VALIDATION_ERROR',
    message: 'Confira os campos destacados.',
    fields: fieldErrors(parsed.error),
  })
  return undefined
}
