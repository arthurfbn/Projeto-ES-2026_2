import { fail, ok, type Result } from '../../../shared/result'
import { checkServiceTerms } from '../core/service-terms'
import type { BarbershopPorts, NewService, ServicePatch, ServiceRecord } from './ports'

type TermsError = 'INVALID_PRICE' | 'INVALID_DURATION'

/** Visão do gerente: ativos e inativos (serviço nunca é excluído). */
export function listServices(ports: BarbershopPorts, barbershopId: string): Promise<ServiceRecord[]> {
  return ports.services.listByBarbershop(barbershopId)
}

/** R9: novo serviço nasce ativo, com preço e duração válidos. */
export async function createService(
  ports: BarbershopPorts,
  input: { barbershopId: string; service: NewService },
): Promise<Result<ServiceRecord, TermsError>> {
  const terms = checkServiceTerms(input.service)
  if (!terms.ok) return terms
  return ok(await ports.services.create(input.barbershopId, input.service))
}

/** R9: altera nome, preço, duração ou ativo; preço e duração resultantes seguem a regra. */
export async function updateService(
  ports: BarbershopPorts,
  input: { barbershopId: string; serviceId: string; patch: ServicePatch },
): Promise<Result<ServiceRecord, TermsError | 'SERVICE_NOT_FOUND'>> {
  const current = await ports.services.findById(input.barbershopId, input.serviceId)
  if (!current) return fail('SERVICE_NOT_FOUND')

  const terms = checkServiceTerms({ ...current, ...input.patch })
  if (!terms.ok) return terms
  return ok(await ports.services.update(input.barbershopId, input.serviceId, input.patch))
}
