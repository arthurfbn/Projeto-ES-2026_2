import { ref } from 'vue'
import { fieldErrors } from '@shavey/contracts'
import type { z } from 'zod'
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

/**
 * Erros de um formulário validado pelo contrato. Ao sair de um campo, o erro dele some se o valor
 * agora é válido. Erro vindo da API (ex.: e-mail já cadastrado) só some se o valor mudou.
 */
export function useFormErrors(schema: z.ZodObject) {
  const fieldSchemas: Record<string, z.ZodType | undefined> = schema.shape
  const errors = ref<FormErrors>({ fields: {} })
  const rejectedByServer: Record<string, unknown> = {}

  /** Valida tudo antes de enviar. Devolve true se pode enviar. */
  function validateAll(form: Record<string, unknown>): boolean {
    const parsed = schema.safeParse(form)
    errors.value = parsed.success ? { fields: {} } : { fields: fieldErrors(parsed.error) }
    return parsed.success
  }

  function setFromRequest(error: unknown, form: Record<string, unknown>) {
    errors.value = formErrorsFrom(error)
    for (const field of Object.keys(errors.value.fields)) rejectedByServer[field] = form[field]
  }

  function clearIfValid(field: string, value: unknown) {
    if (!errors.value.fields[field]) return
    if (field in rejectedByServer && rejectedByServer[field] === value) return
    const fieldSchema = fieldSchemas[field]
    if (fieldSchema && !fieldSchema.safeParse(value).success) return
    delete rejectedByServer[field]
    const fields = { ...errors.value.fields }
    delete fields[field]
    errors.value = { ...errors.value, fields }
  }

  return { errors, validateAll, setFromRequest, clearIfValid }
}
