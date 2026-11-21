import { z } from 'zod'

/**
 * Barbearia (spec 001, R7–R8). Endereço estruturado, preenchido à mão (busca por CEP está fora
 * do escopo). Campos planos, para os erros por campo chegarem direto ao formulário.
 */

/** Siglas das 27 unidades federativas. */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const

export type BrazilianState = (typeof BRAZILIAN_STATES)[number]

const isBrazilianState = (value: string): value is BrazilianState =>
  (BRAZILIAN_STATES as readonly string[]).includes(value)

const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, 'Texto longo demais.')

/** Aceita 01310100 ou 01310-100; guarda só os 8 dígitos. */
export const cepSchema = z
  .string()
  .trim()
  .refine((value) => /^\d{5}-?\d{3}$/.test(value), 'Informe o CEP com 8 dígitos.')
  .transform((value) => value.replace('-', ''))

export const stateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isBrazilianState, 'Informe a sigla de um estado (ex.: SP).')

export const createBarbershopRequestSchema = z
  .object({
    name: requiredText('Informe o nome da barbearia.', 100),
    cep: cepSchema,
    street: requiredText('Informe a rua.', 200),
    number: requiredText('Informe o número.', 20),
    complement: z
      .string()
      .trim()
      .max(100, 'Texto longo demais.')
      .optional()
      .transform((value) => (value ? value : undefined)),
    neighborhood: requiredText('Informe o bairro.', 100),
    city: requiredText('Informe a cidade.', 100),
    state: stateSchema,
    /** "Eu também atendo": o criador ganha também vínculo de barbeiro (R8). */
    alsoBarber: z.boolean().default(false),
  })
  .strict()

export const barbershopSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  cep: z.string(),
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
})

/** Perfis de quem consulta, nesta barbearia (o backend decide; a web só exibe). */
export const barbershopRolesSchema = z.object({
  manager: z.boolean(),
  barber: z.boolean(),
})

/** POST /barbershops (201) e GET /barbershops/:barbershopId. */
export const barbershopResponseSchema = z.object({
  barbershop: barbershopSchema,
  roles: barbershopRolesSchema,
})

export const barbershopErrorMessages = {
  EXCLUSIVE_MEMBERSHIP_ELSEWHERE:
    'Você tem vínculo exclusivo com outra barbearia, então não pode atender nesta. Crie sem marcar "eu também atendo".',
  BARBERSHOP_NOT_FOUND: 'Barbearia não encontrada.',
} as const

export type CreateBarbershopRequest = z.input<typeof createBarbershopRequestSchema>
export type Barbershop = z.infer<typeof barbershopSchema>
export type BarbershopRoles = z.infer<typeof barbershopRolesSchema>
export type BarbershopResponse = z.infer<typeof barbershopResponseSchema>
