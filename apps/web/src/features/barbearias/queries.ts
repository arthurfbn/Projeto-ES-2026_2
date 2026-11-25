import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type {
  CreateBarbershopRequest,
  CreateInvitationRequest,
  CreateServiceRequest,
  UpdateMembershipRequest,
  UpdateServiceRequest,
  WeeklyWindow,
} from '@shavey/contracts'
import { meQueryKey } from '@/features/conta/queries'
import { ApiError } from '@/lib/http'
import {
  acceptInvitation,
  cancelInvitation,
  createBarbershop,
  createService,
  declineInvitation,
  fetchBarbershop,
  fetchMemberships,
  fetchOwnMembership,
  fetchReceivedInvitations,
  fetchSentInvitations,
  fetchServices,
  inviteToBarbershop,
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

export const sentInvitationsQueryKey = (barbershopId: string) => ['barbershops', barbershopId, 'invitations'] as const

/** R10: gerente convida por e-mail; o convite entra na lista de pendentes. */
export function useInviteToBarbershop(barbershopId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvitationRequest) => inviteToBarbershop(toValue(barbershopId), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sentInvitationsQueryKey(toValue(barbershopId)) }),
  })
}

/** R13: convites pendentes enviados pela barbearia (visão do gerente). */
export function useSentInvitations(barbershopId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => sentInvitationsQueryKey(toValue(barbershopId))),
    queryFn: ({ signal }) => fetchSentInvitations(toValue(barbershopId), signal),
  })
}

export function useCancelInvitation(barbershopId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(toValue(barbershopId), invitationId),
    // Mesmo se falhar (ex.: já recusado ou expirado), a lista é recarregada para mostrar o estado atual.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sentInvitationsQueryKey(toValue(barbershopId)) }),
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

/** R13: o convidado recusa; a lista é recarregada mesmo se o convite já tiver mudado de estado. */
export function useDeclineInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => declineInvitation(invitationId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: receivedInvitationsQueryKey }),
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, confirmLeave }: { invitationId: string; confirmLeave?: boolean }) =>
      acceptInvitation(invitationId, confirmLeave),
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
