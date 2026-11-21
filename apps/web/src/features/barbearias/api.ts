import {
  barbershopResponseSchema,
  serviceListResponseSchema,
  serviceResponseSchema,
  type BarbershopResponse,
  type CreateBarbershopRequest,
  type CreateServiceRequest,
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

export async function updateService(barbershopId: string, serviceId: string, patch: UpdateServiceRequest): Promise<Service> {
  const path = `${servicesPath(barbershopId)}/${encodeURIComponent(serviceId)}`
  return (await apiPatch(path, patch, serviceResponseSchema)).service
}
