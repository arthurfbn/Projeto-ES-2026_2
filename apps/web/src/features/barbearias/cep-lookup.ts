import { z } from 'zod'

/**
 * Busca de endereço pelo CEP no ViaCEP (público, sem chave), direto do navegador.
 * É só ajuda de preenchimento: a API valida o endereço do mesmo jeito (createBarbershopRequestSchema).
 */

export type CepAddress = { street: string; neighborhood: string; city: string; state: string }
export type CepLookupResult = { kind: 'found'; address: CepAddress } | { kind: 'not_found' }

const VIACEP_URL = 'https://viacep.com.br/ws'
const DEFAULT_TIMEOUT_MS = 5000

// Resposta externa: validada antes de usar. O ViaCEP responde {"erro": "true"} (ou true) para CEP inexistente.
const notFoundSchema = z.object({ erro: z.union([z.literal(true), z.literal('true')]) })
const addressSchema = z.object({
  logradouro: z.string(),
  bairro: z.string(),
  localidade: z.string(),
  uf: z.string(),
})

/**
 * Endereço do CEP (8 dígitos). "Não encontrado" para CEP inexistente; rejeita em falha de rede,
 * tempo esgotado, cancelamento ou resposta fora do formato, e quem chama abre o preenchimento manual.
 */
export async function lookupCep(
  cep: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<CepLookupResult> {
  if (!/^\d{8}$/.test(cep)) throw new Error('CEP precisa de 8 dígitos')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort)
  try {
    const response = await fetch(`${VIACEP_URL}/${cep}/json/`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 400) return { kind: 'not_found' }
    if (!response.ok) throw new Error(`ViaCEP respondeu ${response.status}`)

    const body: unknown = await response.json()
    if (notFoundSchema.safeParse(body).success) return { kind: 'not_found' }
    const { logradouro, bairro, localidade, uf } = addressSchema.parse(body)
    return {
      kind: 'found',
      address: { street: logradouro.trim(), neighborhood: bairro.trim(), city: localidade.trim(), state: uf.trim() },
    }
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}
