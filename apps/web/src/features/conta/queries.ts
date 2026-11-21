import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import type { LoginRequest, MeResponse, SignupRequest } from '@shavey/contracts'
import { fetchMe, login, logout, signup } from './api'

export const meQueryKey = ['me'] as const

export const meQueryOptions = {
  queryKey: meQueryKey,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchMe(signal),
  staleTime: 60_000,
}

/** Sessão atual (null = visitante). Usada pela interface e pelo guard do router. */
export function useMe() {
  return useQuery(meQueryOptions)
}

export function fetchMeCached(queryClient: QueryClient): Promise<MeResponse | null> {
  return queryClient.ensureQueryData(meQueryOptions)
}

export function useSignup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SignupRequest) => signup(input),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginRequest) => login(input),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      // Nada do usuário anterior pode sobrar em cache; a consulta de sessão continua viva, agora vazia.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== meQueryKey[0] })
      queryClient.setQueryData(meQueryKey, null)
    },
  })
}
