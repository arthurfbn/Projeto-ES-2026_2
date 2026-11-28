import type { Clock } from '../../../shared/clock'
import type { AvailabilityWindow, BusyInterval } from '../core/slots'

/** Barbeiro que realiza o serviço na barbearia, com preço e duração que valem para ele. */
export type OfferedBarber = {
  membershipId: string
  userId: string
  isActive: boolean
  acceptsAppointments: boolean
  priceCents: number
  durationMinutes: number
  /** Disponibilidade dele nesta barbearia. */
  availability: AvailabilityWindow[]
}

export type ServiceOffer = { serviceIsActive: boolean; barbers: OfferedBarber[] }

/**
 * Implementada pelo módulo barbearias (dono de serviços, vínculos e disponibilidade), injetada na
 * composição: este módulo não lê as tabelas dele (ADR-0003).
 */
export interface BookingCatalog {
  /** null = o serviço não é desta barbearia. */
  serviceOffer(input: { barbershopId: string; serviceId: string }): Promise<ServiceOffer | null>
}

/**
 * Agendamentos ativos (R5) e do dia (R8). A tabela nasce na fatia de agendar (#45); até lá, o
 * adapter devolve vazio.
 */
export interface AppointmentReader {
  /** Agendamentos ativos de cada barbeiro (por userId), em qualquer barbearia, que tocam [from, to). */
  busyByBarber(input: { userIds: string[]; from: Date; to: Date }): Promise<Map<string, BusyInterval[]>>
  /** Agendamentos no dia naquela barbearia, por vínculo (R8). */
  countsOnDay(input: { barbershopId: string; from: Date; to: Date }): Promise<Map<string, number>>
}

/** Do módulo identidade: nome de cada barbeiro. */
export interface BarberNames {
  findNamesByIds(ids: readonly string[]): Promise<Map<string, string>>
}

export type AgendaPorts = {
  catalog: BookingCatalog
  appointments: AppointmentReader
  users: BarberNames
  clock: Clock
}
