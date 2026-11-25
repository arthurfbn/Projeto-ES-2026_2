import {
  acceptInvitationResponseSchema,
  availabilityListResponseSchema,
  availabilityResponseSchema,
  barberServiceListResponseSchema,
  barberServiceResponseSchema,
  barbershopResponseSchema,
  membershipListResponseSchema,
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
  type BarbershopResponse,
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

const servicesPath = (barbershopId: string) => `/barbershops/${encodeURIComponent(barbershopId)}/services`

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
