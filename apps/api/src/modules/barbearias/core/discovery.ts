import { effectiveTerms } from './barber-service'

/**
 * Descoberta (spec 003, R1–R3; ADR-0022): busca, serviços da plataforma e o que a página da
 * barbearia mostra. Só entram barbearias **agendáveis** (CONTEXT.md): com barbeiro de vínculo
 * ativo, aceitando agendamentos, que realiza um serviço ativo.
 */

/** Barbearia agendável com os nomes dos seus serviços agendáveis. */
export type BookableBarbershop = {
  id: string
  name: string
  neighborhood: string
  city: string
  state: string
  serviceNames: string[]
}

/** Minúsculas, sem acentos e com espaços simples: base da busca e dos chips (R1, R2). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'pt-BR')

/**
 * R1, R2: barbearias cujo nome, bairro ou cidade contém o texto, e/ou que oferecem o serviço do
 * chip (pelo nome normalizado). Em ordem de nome.
 */
export function searchBarbershops(
  barbershops: BookableBarbershop[],
  filter: { q?: string; serviceKey?: string },
): BookableBarbershop[] {
  const q = filter.q ? normalizeText(filter.q) : ''
  const serviceKey = filter.serviceKey ? normalizeText(filter.serviceKey) : ''

  return barbershops
    .filter((shop) => !q || [shop.name, shop.neighborhood, shop.city].some((field) => normalizeText(field).includes(q)))
    .filter((shop) => !serviceKey || shop.serviceNames.some((name) => normalizeText(name) === serviceKey))
    .sort(byName)
}

export type PlatformService = { key: string; name: string }

const startsUppercase = (text: string) => text.charAt(0) !== text.charAt(0).toLowerCase()

/**
 * R2: chips com os serviços das barbearias agendáveis, agrupados pelo nome normalizado. O chip
 * mostra a grafia mais comum; no empate, a que começa com maiúscula; depois, a ordem alfabética.
 */
export function platformServices(barbershops: BookableBarbershop[]): PlatformService[] {
  const spellingsByKey = new Map<string, Map<string, number>>()
  for (const name of barbershops.flatMap((shop) => shop.serviceNames)) {
    const key = normalizeText(name)
    const spellings = spellingsByKey.get(key) ?? new Map<string, number>()
    spellings.set(name.trim(), (spellings.get(name.trim()) ?? 0) + 1)
    spellingsByKey.set(key, spellings)
  }

  return [...spellingsByKey.entries()]
    .map(([key, spellings]) => {
      const [name] = [...spellings.entries()].sort(
        ([a, countA], [b, countB]) =>
          countB - countA || Number(startsUppercase(b)) - Number(startsUppercase(a)) || a.localeCompare(b, 'pt-BR'),
      )[0] ?? [key]
      return { key, name }
    })
    .sort((a, b) => a.key.localeCompare(b.key, 'pt-BR'))
}

/** Serviço da barbearia com os barbeiros que o realizam, como vêm do banco. */
export type PageService = {
  id: string
  name: string
  isActive: boolean
  priceCents: number
  durationMinutes: number
  barbers: {
    membershipId: string
    name: string
    isActive: boolean
    acceptsAppointments: boolean
    /** Próprios do barbeiro; null = padrão do serviço. */
    ownPriceCents: number | null
    ownDurationMinutes: number | null
  }[]
}

export type BookableService = {
  id: string
  name: string
  barbers: { membershipId: string; name: string; priceCents: number; durationMinutes: number }[]
}

/**
 * R3: serviços agendáveis da página da barbearia, cada um com os barbeiros agendáveis que o
 * realizam e o preço e a duração deles (próprios ou padrão, R16 da spec 001). Em ordem de nome.
 */
export function bookableServices(services: PageService[]): BookableService[] {
  return services
    .filter((service) => service.isActive)
    .map((service) => ({
      id: service.id,
      name: service.name,
      barbers: service.barbers
        .filter((barber) => barber.isActive && barber.acceptsAppointments)
        .map((barber) => ({
          membershipId: barber.membershipId,
          name: barber.name,
          ...effectiveTerms(service, { priceCents: barber.ownPriceCents, durationMinutes: barber.ownDurationMinutes }),
        }))
        .sort(byName),
    }))
    .filter((service) => service.barbers.length > 0)
    .sort(byName)
}
