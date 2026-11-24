import type { BrazilianState } from '@shavey/contracts'
import type { Clock } from '../../../shared/clock'
import type { WeeklyWindow } from '../core/allowed-shift'
import type { BarbershopCreationPlan } from '../core/barbershop-creation'
import type {
  InvitationAcceptancePlan,
  InvitationKind,
  InvitationStatus,
  NewInvitation,
  PendingInvitation,
} from '../core/invitation'

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

/** Implementada pelo módulo identidade (dono da tabela `users`), injetada na composição. */
export interface UserDirectory {
  /** E-mail já normalizado em minúsculas pelo contrato. */
  findIdByEmail(email: string): Promise<{ id: string } | null>
  /** Nomes por id (ex.: barbeiro na lista de vínculos); id sem usuário fica de fora. */
  findNamesByIds(ids: readonly string[]): Promise<Map<string, string>>
}

/** Convite visto pelo gerente que acabou de enviá-lo. */
export type SentInvitationRecord = {
  id: string
  kind: InvitationKind
  isExclusive: boolean
  status: InvitationStatus
  expiresAt: Date
}

/** Convite pendente visto pelo convidado. */
export type ReceivedInvitationRecord = {
  id: string
  barbershopId: string
  barbershopName: string
  kind: InvitationKind
  isExclusive: boolean
  expiresAt: Date
}

export interface InvitationRepository {
  create(invitation: NewInvitation): Promise<SentInvitationRecord>
  findById(invitationId: string): Promise<PendingInvitation | null>
  listPendingForInvitee(userId: string): Promise<ReceivedInvitationRecord[]>
  /**
   * Marca o convite como aceito e cria a gerência ou o vínculo, numa transação.
   * Devolve false (sem gravar nada) se o convite deixou de estar pendente no meio do caminho.
   */
  accept(plan: InvitationAcceptancePlan): Promise<boolean>
}

export type MembershipRecord = {
  id: string
  userId: string
  hiredAt: Date
  isExclusive: boolean
  acceptsAppointments: boolean
  isActive: boolean
  /** Turno permitido, ordenado por dia e início; vazio = sem turno. */
  shift: WeeklyWindow[]
}

export type MembershipPatch = Partial<Pick<MembershipRecord, 'acceptsAppointments' | 'isActive'>>

/** Vínculos sempre buscados dentro de uma barbearia: id de outra barbearia não é encontrado. */
export interface MembershipRepository {
  listByBarbershop(barbershopId: string): Promise<MembershipRecord[]>
  findById(barbershopId: string, membershipId: string): Promise<MembershipRecord | null>
  /** Troca o turno inteiro numa transação. */
  replaceShift(membershipId: string, windows: WeeklyWindow[]): Promise<void>
  update(membershipId: string, patch: MembershipPatch): Promise<void>
  /** Vínculos ativos do barbeiro fora desta barbearia (para a exclusividade). */
  activeElsewhere(userId: string, barbershopId: string): Promise<{ any: boolean; exclusive: boolean }>
  /**
   * Vínculo pelo id, de qualquer barbearia, com a barbearia e quem aprovou. Só para a página do
   * próprio barbeiro: quem chama confere `userId` (ver app/own-membership.ts).
   */
  findWithOrigin(membershipId: string): Promise<(MembershipRecord & MembershipOrigin) | null>
}

export type MembershipOrigin = { barbershopId: string; approvedByUserId: string }

/**
 * Disponibilidade semanal do barbeiro nesta barbearia (R21). A disponibilidade nasce na #14;
 * até lá a composição liga "nenhuma disponibilidade" (ver index.ts).
 */
export interface AvailabilityReader {
  weeklyWindows(input: { barbershopId: string; userId: string }): Promise<WeeklyWindow[]>
}

/** Serviço do barbeiro com o padrão do serviço ao lado, para calcular o que vale (R16). */
export type BarberServiceRecord = {
  serviceId: string
  name: string
  serviceIsActive: boolean
  defaultPriceCents: number
  defaultDurationMinutes: number
  /** Próprios do barbeiro; null = padrão. */
  priceCents: number | null
  durationMinutes: number | null
}

/** Sempre dentro de uma barbearia e de um vínculo dela. */
export interface BarberServiceRepository {
  listByMembership(barbershopId: string, membershipId: string): Promise<BarberServiceRecord[]>
  find(barbershopId: string, membershipId: string, serviceId: string): Promise<BarberServiceRecord | null>
  /** Atribui o serviço ao barbeiro ou, se já atribuído, troca os valores próprios. */
  upsert(input: {
    barbershopId: string
    membershipId: string
    serviceId: string
    priceCents: number | null
    durationMinutes: number | null
  }): Promise<void>
  /** Devolve false se o barbeiro não realizava o serviço. */
  remove(barbershopId: string, membershipId: string, serviceId: string): Promise<boolean>
}

export type BarbershopPorts = {
  barbershops: BarbershopRepository
  services: ServiceRepository
  invitations: InvitationRepository
  memberships: MembershipRepository
  barberServices: BarberServiceRepository
  availability: AvailabilityReader
  users: UserDirectory
  clock: Clock
}
