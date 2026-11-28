import { z } from 'zod'
import { barbershopSchema } from './barbershops'

/** Descoberta para quem entrou (spec 003, R1–R3; ADR-0022): busca, chips e página da barbearia. */

/** GET /barbershops/search?q=…&service=… (ao menos um dos dois). */
export const barbershopSearchQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    /** Chave do chip (nome normalizado do serviço). */
    service: z.string().trim().max(80).optional(),
  })
  .strict()
  .refine((query) => Boolean(query.q || query.service), 'Digite o que procura ou escolha um serviço.')

export const barbershopSearchResultSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
})

export const barbershopSearchResponseSchema = z.object({ barbershops: z.array(barbershopSearchResultSchema) })

/** GET /platform-services: chips abaixo da busca. */
export const platformServiceSchema = z.object({ key: z.string(), name: z.string() })
export const platformServicesResponseSchema = z.object({ services: z.array(platformServiceSchema) })

export const pageBarberSchema = z.object({
  membershipId: z.uuid(),
  name: z.string(),
  priceCents: z.number().int(),
  durationMinutes: z.number().int(),
})

export const pageServiceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  barbers: z.array(pageBarberSchema),
})

/** GET /barbershops/:barbershopId/page: o que o cliente vê (diferente da Gestão da barbearia). */
export const barbershopPageResponseSchema = z.object({
  barbershop: barbershopSchema,
  services: z.array(pageServiceSchema),
})

export type BarbershopSearchQuery = z.input<typeof barbershopSearchQuerySchema>
export type BarbershopSearchResult = z.infer<typeof barbershopSearchResultSchema>
export type BarbershopSearchResponse = z.infer<typeof barbershopSearchResponseSchema>
export type PlatformService = z.infer<typeof platformServiceSchema>
export type PlatformServicesResponse = z.infer<typeof platformServicesResponseSchema>
export type PageService = z.infer<typeof pageServiceSchema>
export type BarbershopPageResponse = z.infer<typeof barbershopPageResponseSchema>
