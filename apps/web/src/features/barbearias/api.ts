import {
  acceptInvitationResponseSchema,
  appointmentResponseSchema,
  slotsResponseSchema,
  type AppointmentResponse,
  type CreateAppointmentRequest,
  type SlotsResponse,
  availabilityListResponseSchema,
  availabilityResponseSchema,
  barberServiceListResponseSchema,
  barberServiceResponseSchema,
  barbershopPageResponseSchema,
  barbershopResponseSchema,
  barbershopSearchResponseSchema,
  membershipListResponseSchema,
  platformServicesResponseSchema,
  membershipResponseSchema,
  ownMembershipResponseSchema,
  receivedInvitationListResponseSchema,
  sentInvitationListResponseSchema,
  sentInvitationResponseSchema,
  serviceListResponseSchema,
  serviceResponseSchema,
  type AcceptInvitationResponse,
  type Availability,
  type BarberService,
  type BarbershopPageResponse,
  type BarbershopResponse,
  type BarbershopSearchQuery,
  type BarbershopSearchResult,
  type PlatformService,
  type CreateAvailabilityRequest,
  type CreateBarbershopRequest,
  type CreateInvitationRequest,
  type CreateServiceRequest,
  type Membership,
  type OwnMembership,
  type ReceivedInvitation,
  type SentInvitation,
  type SentInvitationResponse,
  type Service,
  type SetBarberServiceRequest,
  type UpdateMembershipRequest,
  type UpdateServiceRequest,
  type WeeklyWindow,
} from '@shavey/contracts'

import { apiDelete, apiGet, apiPatch, apiPost, apiPostEmpty, apiPut } from '@/lib/http'

export function createBarbershop(input: CreateBarbershopRequest): Promise<BarbershopResponse> {
  return apiPost('/barbershops', input, barbershopResponseSchema)
}

export function fetchBarbershop(barbershopId: string, signal?: AbortSignal): Promise<BarbershopResponse> {
  return apiGet(`/barbershops/${encodeURIComponent(barbershopId)}`, barbershopResponseSchema, { signal })
}

/** R1, R2: barbearias agendáveis pelo texto e/ou pelo chip de serviço. */
export async function searchBarbershops(
  query: BarbershopSearchQuery,
  signal?: AbortSignal,
): Promise<BarbershopSearchResult[]> {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.service) params.set('service', query.service)
  return (await apiGet(`/barbershops/search?${params}`, barbershopSearchResponseSchema, { signal })).barbershops
}

/** R2: chips dos serviços da plataforma. */
export async function fetchPlatformServices(signal?: AbortSignal): Promise<PlatformService[]> {
  return (await apiGet('/platform-services', platformServicesResponseSchema, { signal })).services
}

/** R5–R8: horários livres do serviço num dia; sem `membershipId` = "qualquer barbeiro". */
export function fetchSlots(
  input: { barbershopId: string; serviceId: string; date: string; membershipId?: string },
  signal?: AbortSignal,
): Promise<SlotsResponse> {
  const params = new URLSearchParams({ date: input.date })
  if (input.membershipId) params.set('membershipId', input.membershipId)
  const path = `/barbershops/${encodeURIComponent(input.barbershopId)}/services/${encodeURIComponent(input.serviceId)}/slots`
  return apiGet(`${path}?${params}`, slotsResponseSchema, { signal })
}

/** R9–R11: agenda pagando no local. */
export function createAppointment(barbershopId: string, input: CreateAppointmentRequest): Promise<AppointmentResponse> {
  return apiPost(`/barbershops/${encodeURIComponent(barbershopId)}/appointments`, input, appointmentResponseSchema)
}

/** R3: página da barbearia, a visão do cliente (diferente da Gestão). */
export function fetchBarbershopPage(barbershopId: string, signal?: AbortSignal): Promise<BarbershopPageResponse> {
  return apiGet(`/barbershops/${encodeURIComponent(barbershopId)}/page`, barbershopPageResponseSchema, { signal })
}

const servicesPath =(barbershopId: string) => `/barbershops/${encodeURIComponent(barbershopId)}/services`

export async function fetchServices(barbershopId: string, signal?: AbortSignal): Promise<Service[]> {
  return (await apiGet(servicesPath(barbershopId), serviceListResponseSchema, { signal })).services
}

export async function createService(barbershopId: string, input: CreateServiceRequest): Promise<Service> {
  return (await apiPost(servicesPath(barbershopId), input, serviceResponseSchema)).service
}

export async function inviteToBarbershop(
  barbershopId: string,
  input: CreateInvitationRequest,
): Promise<SentInvitationResponse['invitation']> {
  const path = `/barbershops/${encodeURIComponent(barbershopId)}/invitations`
  return (await apiPost(path, input, sentInvitationResponseSchema)).invitation
}

export async function fetchReceivedInvitations(signal?: AbortSignal): Promise<ReceivedInvitation[]> {
  return (await apiGet('/invitations', receivedInvitationListResponseSchema, { signal })).invitations
}

const invitationPath = (invitationId: string) => `/invitations/${encodeURIComponent(invitationId)}`

/** R14c: `confirmLeave` confirma a saída das outras barbearias num convite exclusivo. */
export function acceptInvitation(invitationId: string, confirmLeave = false): Promise<AcceptInvitationResponse> {
  return apiPost(`${invitationPath(invitationId)}/accept`, { confirmLeave }, acceptInvitationResponseSchema)
}

export function declineInvitation(invitationId: string): Promise<void> {
  return apiPostEmpty(`${invitationPath(invitationId)}/decline`)
}

const sentInvitationsPath = (barbershopId: string) => `/barbershops/${encodeURIComponent(barbershopId)}/invitations`

export async function fetchSentInvitations(barbershopId: string, signal?: AbortSignal): Promise<SentInvitation[]> {
  return (await apiGet(sentInvitationsPath(barbershopId), sentInvitationListResponseSchema, { signal })).invitations
}

export function cancelInvitation(barbershopId: string, invitationId: string): Promise<void> {
  return apiPostEmpty(`${sentInvitationsPath(barbershopId)}/${encodeURIComponent(invitationId)}/cancel`)
}

export async function updateService(barbershopId: string, serviceId: string, patch: UpdateServiceRequest): Promise<Service> {
  const path = `${servicesPath(barbershopId)}/${encodeURIComponent(serviceId)}`
  return (await apiPatch(path, patch, serviceResponseSchema)).service
}

const membershipsPath = (barbershopId: string) => `/barbershops/${encodeURIComponent(barbershopId)}/memberships`

export async function fetchMemberships(barbershopId: string, signal?: AbortSignal): Promise<Membership[]> {
  return (await apiGet(membershipsPath(barbershopId), membershipListResponseSchema, { signal })).memberships
}

export async function updateShift(barbershopId: string, membershipId: string, windows: WeeklyWindow[]): Promise<Membership> {
  const path = `${membershipsPath(barbershopId)}/${encodeURIComponent(membershipId)}/shift`
  return (await apiPut(path, { windows }, membershipResponseSchema)).membership
}

export async function updateMembership(
  barbershopId: string,
  membershipId: string,
  patch: UpdateMembershipRequest,
): Promise<Membership> {
  const path = `${membershipsPath(barbershopId)}/${encodeURIComponent(membershipId)}`
  return (await apiPatch(path, patch, membershipResponseSchema)).membership
}

const barberServicesPath = (barbershopId: string, membershipId: string) =>
  `${membershipsPath(barbershopId)}/${encodeURIComponent(membershipId)}/services`

export async function fetchBarberServices(
  barbershopId: string,
  membershipId: string,
  signal?: AbortSignal,
): Promise<BarberService[]> {
  return (await apiGet(barberServicesPath(barbershopId, membershipId), barberServiceListResponseSchema, { signal }))
    .services
}

export async function setBarberService(
  barbershopId: string,
  membershipId: string,
  serviceId: string,
  input: SetBarberServiceRequest,
): Promise<BarberService> {
  const path = `${barberServicesPath(barbershopId, membershipId)}/${encodeURIComponent(serviceId)}`
  return (await apiPut(path, input, barberServiceResponseSchema)).service
}

export function removeBarberService(barbershopId: string, membershipId: string, serviceId: string): Promise<void> {
  return apiDelete(`${barberServicesPath(barbershopId, membershipId)}/${encodeURIComponent(serviceId)}`)
}

/** Página do vínculo, vista pelo próprio barbeiro (ADR-0022). */
export async function fetchOwnMembership(membershipId: string, signal?: AbortSignal): Promise<OwnMembership> {
  const path = `/memberships/${encodeURIComponent(membershipId)}`
  return (await apiGet(path, ownMembershipResponseSchema, { signal })).membership
}

const availabilityPath = (membershipId: string) => `/memberships/${encodeURIComponent(membershipId)}/availability`

export async function fetchAvailabilities(membershipId: string, signal?: AbortSignal): Promise<Availability[]> {
  return (await apiGet(availabilityPath(membershipId), availabilityListResponseSchema, { signal })).availabilities
}

export async function createAvailability(membershipId: string, input: CreateAvailabilityRequest): Promise<Availability> {
  return (await apiPost(availabilityPath(membershipId), input, availabilityResponseSchema)).availability
}

export function removeAvailability(membershipId: string, availabilityId: string): Promise<void> {
  return apiDelete(`${availabilityPath(membershipId)}/${encodeURIComponent(availabilityId)}`)
}
