import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { CreateBarbershopRequest } from '@shavey/contracts'
import { ApiError } from '@/lib/http'
import { meQueryKey } from '@/features/conta/queries'
import { createBarbershop, fetchBarbershop } from './api'

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
    onSuccess: async (created) => {
      queryClient.setQueryData(barbershopQueryKey(created.barbershop.id), created)
      // Novo perfil (gerente, e talvez barbeiro): o seletor de visão precisa saber.
      await queryClient.invalidateQueries({ queryKey: meQueryKey })
    },
  })
}
