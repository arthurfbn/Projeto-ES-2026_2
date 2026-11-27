import { computed, ref, watch } from 'vue'
import { lookupCep, type CepAddress } from './cep-lookup'

export type AddressField = keyof CepAddress
type AddressForm = { cep: string } & CepAddress

const ADDRESS_FIELDS: readonly AddressField[] = ['street', 'neighborhood', 'city', 'state']

export type CepLookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'failed'

/**
 * Preenche rua, bairro, cidade e UF pelo CEP (#21). Busca só quando o CEP chega a 8 dígitos
 * e cancela a busca anterior. Trava apenas os campos que vieram preenchidos; o que veio vazio
 * fica aberto. Trocar o CEP limpa e destrava o que foi preenchido automaticamente, sem tocar no
 * que a pessoa digitou. Falha do ViaCEP nunca trava o formulário: tudo fica aberto.
 */
export function useCepAutofill(form: AddressForm, onFilled?: (fields: AddressField[]) => void) {
  const status = ref<CepLookupStatus>('idle')
  const filled = ref<AddressField[]>([])
  let current: AbortController | null = null

  function clearFilled() {
    for (const field of filled.value) form[field] = ''
    filled.value = []
  }

  async function search(cep: string) {
    const controller = new AbortController()
    current = controller
    status.value = 'loading'
    try {
      const result = await lookupCep(cep, { signal: controller.signal })
      if (current !== controller) return
      if (result.kind === 'not_found') {
        status.value = 'not_found'
        return
      }
      const fields = ADDRESS_FIELDS.filter((field) => result.address[field] !== '')
      for (const field of fields) form[field] = result.address[field]
      filled.value = fields
      status.value = 'found'
      onFilled?.(fields)
    } catch {
      // Busca trocada por outra (novo CEP) não é falha; o resto (rede, tempo, formato) é.
      if (current === controller) status.value = 'failed'
    }
  }

  const digits = computed(() => form.cep.replace(/\D/g, ''))

  watch(digits, (cep) => {
    current?.abort()
    current = null
    clearFilled()
    status.value = 'idle'
    if (cep.length === 8) void search(cep)
  })

  return {
    status,
    loading: computed(() => status.value === 'loading'),
    isLocked: (field: AddressField) => filled.value.includes(field),
  }
}
