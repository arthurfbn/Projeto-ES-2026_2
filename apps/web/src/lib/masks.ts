/**
 * Máscaras de campos numéricos. Cada máscara recebe o texto digitado (com qualquer lixo)
 * e devolve o texto formatado só com os dígitos aceitos. O TextField cuida do cursor.
 */
export type DigitMask = { format(raw: string): string }

export const PHONE_MAX_DIGITS = 11

/** Dígitos do telefone: sem não-dígitos, sem zero inicial (hábito de digitar 0 antes do DDD), no máximo 11. */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, PHONE_MAX_DIGITS)
}

/** (11) 9876-5432 com 10 dígitos; (11) 98765-4321 com 11; parcial enquanto digita. */
export function formatPhone(raw: string): string {
  const digits = phoneDigits(raw)
  if (digits.length === 0) return ''
  const ddd = digits.slice(0, 2)
  if (digits.length <= 2) return `(${ddd}`
  const rest = digits.slice(2)
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  const split = rest.length === 9 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
}

export const phoneMask: DigitMask = { format: formatPhone }

/** 01310-100: hífen depois do 5º dígito; no máximo 8 dígitos. */
export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export const cepMask: DigitMask = { format: formatCep }

export const countDigits = (text: string) => text.replace(/\D/g, '').length

/** Posição no texto logo depois do n-ésimo dígito (0 = início). */
export function positionAfterDigits(text: string, n: number): number {
  if (n <= 0) {
    const first = text.search(/\d/)
    return first === -1 ? text.length : first
  }
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text.charAt(i)) && ++seen === n) return i + 1
  }
  return text.length
}

/** Remove o n-ésimo dígito (1 = primeiro) do texto. */
export function removeDigitAt(text: string, n: number): string {
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text.charAt(i)) && ++seen === n) return text.slice(0, i) + text.slice(i + 1)
  }
  return text
}
