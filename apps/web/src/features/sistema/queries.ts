import { useQuery } from '@tanstack/vue-query'
import { fetchHealth } from './api'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    // A API gratuita pode estar acordando: tenta algumas vezes antes de mostrar erro.
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
  })
}
