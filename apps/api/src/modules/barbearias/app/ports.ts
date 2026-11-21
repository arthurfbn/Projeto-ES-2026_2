import type { BrazilianState } from '@shavey/contracts'
import type { Clock } from '../../../shared/clock'
import type { BarbershopCreationPlan } from '../core/barbershop-creation'

export type BarbershopRecord = {
  id: string
  name: string
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

export type NewBarbershop = Omit<BarbershopRecord, 'id' | 'state' | 'complement'> & {
  state: BrazilianState
  complement?: string
}

/** Perfis de um usuário numa barbearia: gerência e vínculo de barbeiro ativo. */
export type BarbershopRoles = { manager: boolean; barber: boolean }

export interface BarbershopRepository {
  /** R14b: o usuário tem vínculo exclusivo ativo em alguma barbearia. */
  hasActiveExclusiveMembership(userId: string): Promise<boolean>
  /** Grava barbearia, gerência e vínculo (se houver) numa única transação. */
  create(barbershop: NewBarbershop, plan: BarbershopCreationPlan): Promise<BarbershopRecord>
  findById(barbershopId: string): Promise<BarbershopRecord | null>
  findRoles(barbershopId: string, userId: string): Promise<BarbershopRoles>
}

export type ServiceRecord = {
  id: string
  name: string
  priceCents: number
  durationMinutes: number
  isActive: boolean
}

export type NewService = Omit<ServiceRecord, 'id' | 'isActive'>
export type ServicePatch = Partial<Omit<ServiceRecord, 'id'>>

/** Serviços sempre buscados dentro de uma barbearia: id de outra barbearia não é encontrado. */
export interface ServiceRepository {
  listByBarbershop(barbershopId: string): Promise<ServiceRecord[]>
  findById(barbershopId: string, serviceId: string): Promise<ServiceRecord | null>
  create(barbershopId: string, service: NewService): Promise<ServiceRecord>
  update(barbershopId: string, serviceId: string, patch: ServicePatch): Promise<ServiceRecord>
}

export type BarbershopPorts = {
  barbershops: BarbershopRepository
  services: ServiceRepository
  clock: Clock
}
