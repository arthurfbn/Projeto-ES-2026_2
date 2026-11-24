import { fail, ok, type Result } from '../../../shared/result'
import { effectiveTerms, planBarberService, type OwnTerms } from '../core/barber-service'
import type { BarbershopPorts, BarberServiceRecord } from './ports'

export type BarberServiceView = {
  serviceId: string
  name: string
  serviceIsActive: boolean
  priceCents: number | null
  durationMinutes: number | null
  effectivePriceCents: number
  effectiveDurationMinutes: number
}

type Scope = { barbershopId: string; membershipId: string }

function toView(record: BarberServiceRecord): BarberServiceView {
  const effective = effectiveTerms(
    { priceCents: record.defaultPriceCents, durationMinutes: record.defaultDurationMinutes },
    record,
  )
  return {
    serviceId: record.serviceId,
    name: record.name,
    serviceIsActive: record.serviceIsActive,
    priceCents: record.priceCents,
    durationMinutes: record.durationMinutes,
    effectivePriceCents: effective.priceCents,
    effectiveDurationMinutes: effective.durationMinutes,
  }
}

async function membershipExists(ports: BarbershopPorts, scope: Scope): Promise<boolean> {
  return (await ports.memberships.findById(scope.barbershopId, scope.membershipId)) !== null
}

/** R16: serviços que o barbeiro realiza na barbearia, com o que vale para ele. */
export async function listBarberServices(
  ports: BarbershopPorts,
  scope: Scope,
): Promise<Result<BarberServiceView[], 'MEMBERSHIP_NOT_FOUND'>> {
  if (!(await membershipExists(ports, scope))) return fail('MEMBERSHIP_NOT_FOUND')
  const records = await ports.barberServices.listByMembership(scope.barbershopId, scope.membershipId)
  return ok(records.map(toView))
}

/** R16: atribui o serviço ao barbeiro (ou troca os valores próprios). */
export async function setBarberService(
  ports: BarbershopPorts,
  input: Scope & { serviceId: string; own: OwnTerms },
): Promise<
  Result<
    BarberServiceView,
    'MEMBERSHIP_NOT_FOUND' | 'SERVICE_NOT_FOUND' | 'SERVICE_INACTIVE' | 'INVALID_PRICE' | 'INVALID_DURATION'
  >
> {
  if (!(await membershipExists(ports, input))) return fail('MEMBERSHIP_NOT_FOUND')
  const service = await ports.services.findById(input.barbershopId, input.serviceId)
  if (!service) return fail('SERVICE_NOT_FOUND')

  const plan = planBarberService({ service, ...input.own })
  if (!plan.ok) return plan

  await ports.barberServices.upsert({
    barbershopId: input.barbershopId,
    membershipId: input.membershipId,
    serviceId: input.serviceId,
    ...plan.value,
  })
  const saved = await ports.barberServices.find(input.barbershopId, input.membershipId, input.serviceId)
  if (!saved) throw new Error('serviço do barbeiro sumiu logo depois de gravado')
  return ok(toView(saved))
}

/** O barbeiro deixa de realizar o serviço nesta barbearia. */
export async function removeBarberService(
  ports: BarbershopPorts,
  input: Scope & { serviceId: string },
): Promise<Result<void, 'MEMBERSHIP_NOT_FOUND' | 'BARBER_SERVICE_NOT_FOUND'>> {
  if (!(await membershipExists(ports, input))) return fail('MEMBERSHIP_NOT_FOUND')
  const removed = await ports.barberServices.remove(input.barbershopId, input.membershipId, input.serviceId)
  return removed ? ok(undefined) : fail('BARBER_SERVICE_NOT_FOUND')
}
