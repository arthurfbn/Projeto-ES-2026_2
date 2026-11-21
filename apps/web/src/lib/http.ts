import { apiErrorSchema, type ApiErrorBody } from '@shavey/contracts'
import type { z } from 'zod'

/**
 * Cliente HTTP único da web. Sempre fala com /api (mesma origem; o proxy da Vercel
 * ou do Vite repassa para a API — ADR-0015), manda o cookie de sessão e valida a resposta com o contrato.
 */
export class ApiError extends Error {
  /** Corpo de erro padrão da API, quando veio nesse formato. */
  readonly error: ApiErrorBody | undefined

  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API respondeu ${status}`)
    const parsed = apiErrorSchema.safeParse(body)
    this.error = parsed.success ? parsed.data : undefined
  }
}

const API_BASE = '/api'

async function request(
  method: 'GET' | 'POST',
  path: string,
  options: { body?: unknown; acceptStatuses?: number[]; signal?: AbortSignal },
): Promise<unknown> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null)
  const accepted = response.ok || options.acceptStatuses?.includes(response.status)
  if (!accepted) throw new ApiError(response.status, body)
  return body
}

export async function apiGet<S extends z.ZodType>(
  path: string,
  schema: S,
  options: { acceptStatuses?: number[]; signal?: AbortSignal } = {},
): Promise<z.infer<S>> {
  return schema.parse(await request('GET', path, options))
}

export async function apiPost<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>> {
  return schema.parse(await request('POST', path, { body }))
}

/** POST sem corpo de resposta (ex.: 204 do logout). */
export async function apiPostEmpty(path: string): Promise<void> {
  await request('POST', path, {})
}
