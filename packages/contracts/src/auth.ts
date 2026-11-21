import { z } from 'zod'

/**
 * Conta e sessão (spec 001, R1–R4). As mensagens aparecem direto no formulário da web,
 * então ficam em português e sóbrias (docs/design-system.md, "Voz").
 */

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'E-mail longo demais.')
  .pipe(z.email('Informe um e-mail válido.'))

/** Telefone brasileiro: aceita máscara, guarda só dígitos. DDD (sem zero) + 8 ou 9 dígitos. */
export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((digits) => /^[1-9]{2}\d{8,9}$/.test(digits), 'Informe o telefone com DDD (10 ou 11 dígitos).')

export const PASSWORD_MIN_LENGTH = 8

export const signupRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe seu nome.').max(100, 'Nome longo demais.'),
    email: emailSchema,
    phone: phoneSchema,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(128, 'Senha longa demais.'),
  })
  .strict()

export const loginRequestSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Informe sua senha.').max(128, 'Senha longa demais.'),
  })
  .strict()

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
})

/**
 * Perfis do usuário numa barbearia (R5): gerente e/ou barbeiro com vínculo ativo.
 * Ser cliente é implícito: todo usuário é cliente (R2).
 */
export const barbershopProfileSchema = z.object({
  barbershopId: z.uuid(),
  barbershopName: z.string(),
  manager: z.boolean(),
  barber: z.boolean(),
})

/** GET /me, POST /auth/signup e POST /auth/login: o usuário e seus perfis por barbearia. */
export const meResponseSchema = z.object({
  user: userSchema,
  barbershops: z.array(barbershopProfileSchema),
})

/** Corpo de erro padrão da API: código estável + mensagem para o usuário + erros por campo. */
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
})

export const authErrorMessages = {
  EMAIL_TAKEN: 'E-mail já cadastrado.',
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos.',
} as const

export type SignupRequest = z.input<typeof signupRequestSchema>
export type LoginRequest = z.input<typeof loginRequestSchema>
export type User = z.infer<typeof userSchema>
export type BarbershopProfile = z.infer<typeof barbershopProfileSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
export type ApiErrorBody = z.infer<typeof apiErrorSchema>

/** Erros de validação do Zod no formato { campo: primeira mensagem }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_'
    fields[key] ??= issue.message
  }
  return fields
}
