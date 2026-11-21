import { ApiError } from '@/lib/http'

export type FormErrors = { fields: Record<string, string>; general?: string }

/** Traduz a falha de uma mutation em erros por campo + mensagem geral para o formulário. */
export function formErrorsFrom(error: unknown): FormErrors {
  if (error instanceof ApiError && error.error) {
    if (error.error.fields) return { fields: error.error.fields }
    return { fields: {}, general: error.error.message ?? 'Não deu certo. Tente de novo.' }
  }
  return { fields: {}, general: 'Não foi possível falar com o servidor. Tente de novo.' }
}
