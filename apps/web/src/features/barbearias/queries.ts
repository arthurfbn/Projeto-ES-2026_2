import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type {
  CreateBarbershopRequest,
  CreateInvitationRequest,
  CreateServiceRequest,
  SetBarberServiceRequest,
  UpdateMembershipRequest,
  UpdateServiceRequest,
  WeeklyWindow,
} from '@shavey/contracts'
import { meQueryKey } from '@/features/conta/queries'
import { ApiError } from '@/lib/http'
import {
  acceptInvitation,
  createBarbershop,
  createService,
  fetchBarberServices,
  fetchBarbershop,
  fetchMemberships,
  fetchOwnMembership,
  fetchReceivedInvitations,
  fetchServices,
  inviteToBarbershop,
  removeBarberService,
  setBarberService,
  updateMembership,
  updateService,
  updateShift,
} from './api'

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
    onSuccess: async (created) => {
      // A página da barbearia abre já com os dados, sem nova ida à API.
      queryClient.setQueryData(barbershopQueryKey(created.barbershop.id), created)
      // A nova barbearia entra em Minhas barbearias (e em Meus vínculos, com "eu também atendo").
      await queryClient.invalidateQueries({ queryKey: meQueryKey })
    },
  })
}

export const ownMembershipQueryKey = (membershipId: string) => ['memberships', membershipId] as const

/** Página do vínculo (ADR-0022). 404 (não é seu ou não existe) não é tentado de novo. */
export function useOwnMembership(membershipId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ownMembershipQueryKey(toValue(membershipId))),
    queryFn: ({ signal }) => fetchOwnMembership(toValue(membershipId), signal),
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 404) && failureCount < 2,
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

/** R10: gerente convida por e-mail. Sem lista de enviados nesta fatia (cancelar entra na #11). */
export function useInviteToBarbershop(barbershopId: MaybeRefOrGetter<string>) {
  return useMutation({
    mutationFn: (input: CreateInvitationRequest) => inviteToBarbershop(toValue(barbershopId), input),
  })
}

export const receivedInvitationsQueryKey = ['invitations', 'received'] as const

/** Convites pendentes de quem está logado (ADR-0018: vê ao entrar). Só consulta com sessão. */
export function useReceivedInvitations(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: receivedInvitationsQueryKey,
    queryFn: ({ signal }) => fetchReceivedInvitations(signal),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => acceptInvitation(invitationId),
    onSuccess: async (accepted) => {
      // Novo perfil: a lista de convites, a barbearia e os perfis do /me mudam.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: receivedInvitationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: barbershopQueryKey(accepted.barbershopId) }),
        queryClient.invalidateQueries({ queryKey: meQueryKey }),
      ])
    },
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

export const membershipsQueryKey = (barbershopId: string) => ['barbershops', barbershopId, 'memberships'] as const

/** Vínculos da barbearia com o turno (visão do gerente). */
export function useMemberships(barbershopId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => membershipsQueryKey(toValue(barbershopId))),
    queryFn: ({ signal }) => fetchMemberships(toValue(barbershopId), signal),
  })
}

export function useUpdateShift(barbershopId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, windows }: { membershipId: string; windows: WeeklyWindow[] }) =>
      updateShift(toValue(barbershopId), membershipId, windows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membershipsQueryKey(toValue(barbershopId)) }),
  })
}

export function useUpdateMembership(barbershopId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, patch }: { membershipId: string; patch: UpdateMembershipRequest }) =>
      updateMembership(toValue(barbershopId), membershipId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membershipsQueryKey(toValue(barbershopId)) }),
  })
}

export const barberServicesQueryKey = (barbershopId: string, membershipId: string) =>
  ['barbershops', barbershopId, 'memberships', membershipId, 'services'] as const

/** Serviços que o barbeiro realiza na barbearia, com o preço e a duração que valem para ele (R16). */
export function useBarberServices(barbershopId: MaybeRefOrGetter<string>, membershipId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => barberServicesQueryKey(toValue(barbershopId), toValue(membershipId))),
    queryFn: ({ signal }) => fetchBarberServices(toValue(barbershopId), toValue(membershipId), signal),
  })
}

export function useSetBarberService(barbershopId: MaybeRefOrGetter<string>, membershipId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, input }: { serviceId: string; input: SetBarberServiceRequest }) =>
      setBarberService(toValue(barbershopId), toValue(membershipId), serviceId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: barberServicesQueryKey(toValue(barbershopId), toValue(membershipId)) }),
  })
}

export function useRemoveBarberService(barbershopId: MaybeRefOrGetter<string>, membershipId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (serviceId: string) => removeBarberService(toValue(barbershopId), toValue(membershipId), serviceId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: barberServicesQueryKey(toValue(barbershopId), toValue(membershipId)) }),
  })
}
