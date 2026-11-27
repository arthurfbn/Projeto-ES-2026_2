import { fail, ok, type Result } from '../../../shared/result'
import { checkServiceTerms, type ServiceTerms } from './service-terms'

/** Valores próprios do barbeiro para um serviço; null = vale o padrão do serviço (R16). */
export type OwnTerms = { priceCents: number | null; durationMinutes: number | null }

type ServiceDefaults = ServiceTerms & { isActive: boolean }

/**
 * R16: o gerente define que o barbeiro realiza o serviço, com preço e duração próprios opcionais.
 * Valor próprio segue a mesma regra do padrão (R9). Serviço desativado não é atribuído.
 */
export function planBarberService(input: {
  service: ServiceDefaults
  priceCents: number | null
  durationMinutes: number | null
}): Result<OwnTerms, 'SERVICE_INACTIVE' | 'INVALID_PRICE' | 'INVALID_DURATION'> {
  if (!input.service.isActive) return fail('SERVICE_INACTIVE')

  // Confere só o que é próprio; o que falta vem do padrão, que já é válido.
  const terms = checkServiceTerms(effectiveTerms(input.service, input))
  if (!terms.ok) return terms
  return ok({ priceCents: input.priceCents, durationMinutes: input.durationMinutes })
}

/** Preço e duração que valem para o barbeiro: o próprio, ou o padrão do serviço (CA15). */
export function effectiveTerms(service: ServiceTerms, own: OwnTerms): ServiceTerms {
  return {
    priceCents: own.priceCents ?? service.priceCents,
    durationMinutes: own.durationMinutes ?? service.durationMinutes,
  }
}
