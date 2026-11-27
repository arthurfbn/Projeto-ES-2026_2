import type { Clock } from '../../../shared/clock'
import type { Result } from '../../../shared/result'
import type { AppointmentPlan } from '../core/booking'
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

/** Agendamentos ativos (R5) e do dia (R8), lidos da tabela `appointments`. */
export interface AppointmentReader {
  /** Agendamentos ativos de cada barbeiro (por userId), em qualquer barbearia, que tocam [from, to). */
  busyByBarber(input: { userIds: string[]; from: Date; to: Date }): Promise<Map<string, BusyInterval[]>>
  /** Agendamentos no dia naquela barbearia, por vínculo (R8). */
  countsOnDay(input: { barbershopId: string; from: Date; to: Date }): Promise<Map<string, number>>
}

export type NewAppointment = AppointmentPlan & {
  barbershopId: string
  clientUserId: string
  barberUserId: string
  serviceId: string
}

export type AppointmentRecord = NewAppointment & { id: string }

export interface AppointmentRepository {
  /** Traduz a constraint de sobreposição do banco (corrida entre dois clientes, CA8) em erro de domínio. */
  create(appointment: NewAppointment): Promise<Result<AppointmentRecord, 'SLOT_NOT_AVAILABLE'>>
}

/** Do módulo identidade: nome de cada barbeiro. */
export interface BarberNames {
  findNamesByIds(ids: readonly string[]): Promise<Map<string, string>>
}

export type AgendaPorts = {
  catalog: BookingCatalog
  appointments: AppointmentReader & AppointmentRepository
  users: BarberNames
  clock: Clock
}
