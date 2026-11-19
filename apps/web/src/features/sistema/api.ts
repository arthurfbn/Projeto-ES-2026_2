import { healthResponseSchema, type HealthResponse } from '@shavey/contracts'
import { apiGet } from '@/lib/http'

/** 503 também traz o corpo do contrato (banco fora do ar). */
export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiGet('/health', healthResponseSchema, { acceptStatuses: [503], signal })
}
