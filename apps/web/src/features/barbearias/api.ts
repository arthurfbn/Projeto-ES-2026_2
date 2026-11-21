import {
  barbershopResponseSchema,
  membershipListResponseSchema,
  membershipResponseSchema,
  serviceListResponseSchema,
  serviceResponseSchema,
  type BarbershopResponse,
  type CreateBarbershopRequest,
  type CreateServiceRequest,
  type Membership,
  type Service,
  type UpdateMembershipRequest,
  type UpdateServiceRequest,
  type WeeklyWindow,
} from '@shavey/contracts'
import { apiGet, apiPatch, apiPost, apiPut } from '@/lib/http'

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
