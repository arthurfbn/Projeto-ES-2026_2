import { fail, ok, type Result } from '../../../shared/result'

/** Horários andam de 15 em 15 minutos; nenhum serviço dura menos que um passo (CONTEXT.md, "Serviço"). */
export const SERVICE_DURATION_STEP_MINUTES = 15

export type ServiceTerms = { priceCents: number; durationMinutes: number }

/**
 * R9: preço em centavos inteiros e positivo; duração de pelo menos 15 min e múltipla de 15.
 * Vale para o padrão do serviço e para o preço/duração próprios do barbeiro (R16).
 */
export function checkServiceTerms(terms: ServiceTerms): Result<ServiceTerms, 'INVALID_PRICE' | 'INVALID_DURATION'> {
  if (!Number.isInteger(terms.priceCents) || terms.priceCents <= 0) return fail('INVALID_PRICE')

  const { durationMinutes } = terms
  const validDuration =
    Number.isInteger(durationMinutes) &&
    durationMinutes >= SERVICE_DURATION_STEP_MINUTES &&
    durationMinutes % SERVICE_DURATION_STEP_MINUTES === 0
  if (!validDuration) return fail('INVALID_DURATION')

  return ok(terms)
}
