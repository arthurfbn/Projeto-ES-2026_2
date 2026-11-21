import { meResponseSchema, type LoginRequest, type MeResponse, type SignupRequest } from '@shavey/contracts'
import { ApiError, apiGet, apiPost, apiPostEmpty } from '@/lib/http'

export function signup(input: SignupRequest): Promise<MeResponse> {
  return apiPost('/auth/signup', input, meResponseSchema)
}

export function login(input: LoginRequest): Promise<MeResponse> {
  return apiPost('/auth/login', input, meResponseSchema)
}

export function logout(): Promise<void> {
  return apiPostEmpty('/auth/logout')
}

/** Usuário logado, ou null quando não há sessão (401). */
export async function fetchMe(signal?: AbortSignal): Promise<MeResponse | null> {
  try {
    return await apiGet('/me', meResponseSchema, { signal })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
