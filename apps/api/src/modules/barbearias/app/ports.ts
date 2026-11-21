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

export type BarbershopPorts = {
  barbershops: BarbershopRepository
  clock: Clock
}
