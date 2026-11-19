import type { z } from 'zod'

/**
 * Cliente HTTP único da web. Sempre fala com /api (mesma origem; o proxy da Vercel
 * ou do Vite repassa para a API — ADR-0015) e valida a resposta com o contrato.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API respondeu ${status}`)
  }
}

const API_BASE = '/api'

export async function apiGet<S extends z.ZodType>(
  path: string,
  schema: S,
  options: { acceptStatuses?: number[]; signal?: AbortSignal } = {},
): Promise<z.infer<S>> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  })
  const body: unknown = await response.json().catch(() => null)
  const accepted = response.ok || options.acceptStatuses?.includes(response.status)
  if (!accepted) throw new ApiError(response.status, body)
  return schema.parse(body)
}
