import {
  acceptInvitationResponseSchema,
  barbershopResponseSchema,
  receivedInvitationListResponseSchema,
  sentInvitationResponseSchema,
  serviceListResponseSchema,
  serviceResponseSchema,
  type AcceptInvitationResponse,
  type BarbershopResponse,
  type CreateBarbershopRequest,
  type CreateInvitationRequest,
  type CreateServiceRequest,
  type ReceivedInvitation,
  type SentInvitationResponse,
  type Service,
  type UpdateServiceRequest,
} from '@shavey/contracts'
import { apiGet, apiPatch, apiPost } from '@/lib/http'

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

export function acceptInvitation(invitationId: string): Promise<AcceptInvitationResponse> {
  return apiPost(`/invitations/${encodeURIComponent(invitationId)}/accept`, {}, acceptInvitationResponseSchema)
}

export async function updateService(barbershopId: string, serviceId: string, patch: UpdateServiceRequest): Promise<Service> {
  const path = `${servicesPath(barbershopId)}/${encodeURIComponent(serviceId)}`
  return (await apiPatch(path, patch, serviceResponseSchema)).service
}
