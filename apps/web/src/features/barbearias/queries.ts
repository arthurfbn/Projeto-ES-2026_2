import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { CreateBarbershopRequest, CreateServiceRequest, UpdateServiceRequest } from '@shavey/contracts'
import { ApiError } from '@/lib/http'
import { createBarbershop, createService, fetchBarbershop, fetchServices, updateService } from './api'

export const barbershopQueryKey = (barbershopId: string) => ['barbershops', barbershopId] as const

/** Barbearia vista por quem tem perfil nela. 404 (sem acesso ou inexistente) não é tentado de novo. */
export function useBarbershop(barbershopId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => barbershopQueryKey(toValue(barbershopId))),
    queryFn: ({ signal }) => fetchBarbershop(toValue(barbershopId), signal),
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  })
}

export function useCreateBarbershop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBarbershopRequest) => createBarbershop(input),
    // A página da barbearia abre já com os dados, sem nova ida à API.
    onSuccess: (created) => queryClient.setQueryData(barbershopQueryKey(created.barbershop.id), created),
  })
}

export const servicesQueryKey = (barbershopId: string) => ['barbershops', barbershopId, 'services'] as const

/** Serviços da barbearia, ativos e inativos (visão do gerente). */
export function useServices(barbershopId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => servicesQueryKey(toValue(barbershopId))),
    queryFn: ({ signal }) => fetchServices(toValue(barbershopId), signal),
  })
}

export function useCreateService(barbershopId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateServiceRequest) => createService(toValue(barbershopId), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesQueryKey(toValue(barbershopId)) }),
  })
}

export function useUpdateService(barbershopId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, patch }: { serviceId: string; patch: UpdateServiceRequest }) =>
      updateService(toValue(barbershopId), serviceId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesQueryKey(toValue(barbershopId)) }),
  })
}
