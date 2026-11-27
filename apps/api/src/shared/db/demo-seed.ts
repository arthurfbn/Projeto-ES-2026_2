import type { Db } from './prisma'

/**
 * Seed da demo (spec 001 "Seed da demo"; spec 003 #44): 4 barbearias agendáveis em São Paulo,
 * 10 barbeiros (um deles em duas barbearias, sem sobreposição), 20 clientes, serviços, um turno e
 * disponibilidade. Nomes e serviços vêm da seed da disciplina de BD (docs/referencias), nas regras
 * atuais: centavos e durações de 15 em 15 minutos. Cresce a cada fatia.
 *
 * A senha das contas vem de fora (SEED_DEMO_PASSWORD), nunca do código: o repositório é público.
 */

export const DEMO_EMAIL_DOMAIN = 'shavey.test'
const email = (login: string) => `${login}@${DEMO_EMAIL_DOMAIN}`

/** Segunda-feira: início da vigência das disponibilidades e data de contratação dos vínculos. */
const DEMO_START = '2026-11-23'
const h = (hours: number) => hours * 60

type Person = { login: string; name: string; phone: string }
type Window = { weekdays: number[]; start: number; end: number }

type DemoShop = {
  name: string
  address: { cep: string; street: string; number: string; neighborhood: string }
  manager: string
  services: { name: string; priceCents: number; durationMinutes: number }[]
  barbers: {
    login: string
    isExclusive?: boolean
    /** Preço próprio por serviço (nome); o resto vale o padrão. */
    ownPrices?: Record<string, number>
    availability: Window
    shift?: Window
  }[]
}

const people: Person[] = [
  { login: 'joao.souza', name: 'João Souza', phone: '11997853045' },
  { login: 'pedro.ribeiro', name: 'Pedro Ribeiro', phone: '11972012291' },
  { login: 'lucas.alves', name: 'Lucas Alves', phone: '11958036925' },
  { login: 'mateus.moraes', name: 'Mateus Moraes', phone: '11941502139' },
  { login: 'carlos.melo', name: 'Carlos Melo', phone: '11938039751' },
  { login: 'eduardo.lima', name: 'Eduardo Lima', phone: '11950103677' },
  { login: 'andre.carvalho', name: 'André Carvalho', phone: '11985737216' },
  { login: 'marcelo.dias', name: 'Marcelo Dias', phone: '11954224598' },
  { login: 'vinicius.freitas', name: 'Vinícius Freitas', phone: '11963131916' },
  { login: 'marina.pinto', name: 'Marina Pinto', phone: '11944566155' },
  { login: 'juliana.silva', name: 'Juliana Silva', phone: '11944839179' },
]

const clients: Person[] = [
  'Ana Beatriz Costa', 'Bruno Teixeira', 'Camila Rocha', 'Daniel Mendes', 'Elisa Fernandes',
  'Fábio Nogueira', 'Gabriela Lopes', 'Hugo Batista', 'Isabela Monteiro', 'José Ricardo Prado',
  'Karina Duarte', 'Leandro Pires', 'Mariana Castro', 'Nicolas Ramos', 'Olívia Cunha',
  'Paulo Henrique Sá', 'Renata Viana', 'Samuel Torres', 'Tatiane Moura', 'Victor Hugo Reis',
].map((name, i) => ({
  login: `cliente${String(i + 1).padStart(2, '0')}`,
  name,
  phone: `1198${String(1000000 + i * 7919).padStart(7, '0')}`,
}))

const weekdays = [1, 2, 3, 4, 5, 6]

const shops: DemoShop[] = [
  {
    name: 'Barbearia Navalha',
    address: { cep: '01327000', street: 'Rua Treze de Maio', number: '500', neighborhood: 'Bela Vista' },
    manager: 'joao.souza',
    services: [
      { name: 'Corte', priceCents: 4500, durationMinutes: 30 },
      { name: 'Barba', priceCents: 3500, durationMinutes: 30 },
      { name: 'Corte + Barba', priceCents: 7500, durationMinutes: 60 },
    ],
    barbers: [
      { login: 'joao.souza', ownPrices: { Corte: 5000 }, availability: { weekdays, start: h(9), end: h(18) } },
      // Carlos atende de manhã aqui e à tarde na Capital (sem sobreposição; CONTEXT.md).
      { login: 'carlos.melo', availability: { weekdays: [1, 2, 3, 4, 5], start: h(9), end: h(13) } },
      { login: 'eduardo.lima', isExclusive: true, availability: { weekdays, start: h(10), end: h(19) } },
    ],
  },
  {
    name: 'Barbearia Capital',
    address: { cep: '01302001', street: 'Rua da Consolação', number: '2100', neighborhood: 'Consolação' },
    manager: 'pedro.ribeiro',
    services: [
      { name: 'corte', priceCents: 4000, durationMinutes: 30 },
      { name: 'Sobrancelha', priceCents: 2000, durationMinutes: 15 },
      { name: 'Corte + Barba', priceCents: 7000, durationMinutes: 60 },
    ],
    barbers: [
      { login: 'carlos.melo', availability: { weekdays: [1, 2, 3, 4, 5], start: h(14), end: h(19) } },
      {
        login: 'andre.carvalho',
        ownPrices: { corte: 4500 },
        shift: { weekdays: [1, 2, 3, 4, 5], start: h(9), end: h(18) },
        availability: { weekdays: [1, 2, 3, 4, 5], start: h(9), end: h(17) },
      },
      { login: 'marcelo.dias', availability: { weekdays, start: h(11), end: h(20) } },
    ],
  },
  {
    name: 'Barbearia Lâmina',
    address: { cep: '05422001', street: 'Rua dos Pinheiros', number: '800', neighborhood: 'Pinheiros' },
    manager: 'lucas.alves',
    services: [
      { name: 'Corte', priceCents: 5500, durationMinutes: 45 },
      { name: 'Barba completa', priceCents: 4000, durationMinutes: 30 },
      { name: 'Platinado', priceCents: 14000, durationMinutes: 120 },
    ],
    barbers: [
      { login: 'lucas.alves', availability: { weekdays, start: h(9), end: h(17) } },
      { login: 'vinicius.freitas', ownPrices: { Platinado: 15000 }, availability: { weekdays, start: h(12), end: h(20) } },
      { login: 'marina.pinto', isExclusive: true, availability: { weekdays: [2, 3, 4, 5, 6], start: h(9), end: h(18) } },
    ],
  },
  {
    name: 'Barbearia Tesoura',
    address: { cep: '04028000', street: 'Avenida Ibirapuera', number: '2500', neighborhood: 'Moema' },
    manager: 'mateus.moraes',
    services: [
      { name: 'Corte', priceCents: 3500, durationMinutes: 30 },
      { name: 'Corte infantil', priceCents: 3000, durationMinutes: 30 },
      { name: 'Pigmentação de barba', priceCents: 5500, durationMinutes: 45 },
    ],
    barbers: [
      { login: 'mateus.moraes', availability: { weekdays, start: h(8), end: h(16) } },
      { login: 'juliana.silva', availability: { weekdays, start: h(10), end: h(19) } },
    ],
  },
]

export type DemoSeedResult = { created: boolean }

/**
 * Cria os dados da demo. Se a primeira conta da demo já existe, não faz nada (rodar de novo não
 * duplica). Tudo numa transação: ou a demo entra inteira, ou nada entra.
 */
export async function seedDemo(db: Db, passwordHash: string): Promise<DemoSeedResult> {
  const firstPerson = people[0]
  if (!firstPerson) return { created: false }
  if (await db.user.findUnique({ where: { email: email(firstPerson.login) } })) return { created: false }

  await db.$transaction(async (tx) => {
    const userIds = new Map<string, string>()
    for (const person of [...people, ...clients]) {
      const user = await tx.user.create({
        data: { name: person.name, email: email(person.login), phone: person.phone, passwordHash },
        select: { id: true },
      })
      userIds.set(person.login, user.id)
    }
    const userId = (login: string) => {
      const id = userIds.get(login)
      if (!id) throw new Error(`seed: pessoa desconhecida ${login}`)
      return id
    }

    for (const shop of shops) {
      const managerId = userId(shop.manager)
      const barbershop = await tx.barbershop.create({
        data: { name: shop.name, ...shop.address, city: 'São Paulo', state: 'SP' },
        select: { id: true },
      })
      await tx.barbershopManager.create({ data: { barbershopId: barbershop.id, userId: managerId } })

      const serviceIds = new Map<string, string>()
      for (const service of shop.services) {
        const created = await tx.service.create({ data: { barbershopId: barbershop.id, ...service }, select: { id: true } })
        serviceIds.set(service.name, created.id)
      }

      for (const barber of shop.barbers) {
        const barberId = userId(barber.login)
        const membership = await tx.barberMembership.create({
          data: {
            barbershopId: barbershop.id,
            userId: barberId,
            hiredAt: new Date(`${DEMO_START}T12:00:00Z`),
            approvedByUserId: managerId,
            isExclusive: barber.isExclusive ?? false,
            acceptsAppointments: true,
            isActive: true,
          },
          select: { id: true },
        })
        for (const weekday of barber.shift?.weekdays ?? []) {
          await tx.allowedShift.create({
            data: { membershipId: membership.id, weekday, startMinute: barber.shift?.start ?? 0, endMinute: barber.shift?.end ?? 0 },
          })
        }
        for (const [serviceName, serviceId] of serviceIds) {
          await tx.barberService.create({
            data: {
              barbershopId: barbershop.id,
              membershipId: membership.id,
              serviceId,
              priceCents: barber.ownPrices?.[serviceName] ?? null,
            },
          })
        }
        for (const weekday of barber.availability.weekdays) {
          await tx.barberAvailability.create({
            data: {
              barbershopId: barbershop.id,
              userId: barberId,
              membershipId: membership.id,
              weekday,
              startMinute: barber.availability.start,
              endMinute: barber.availability.end,
              validFrom: new Date(`${DEMO_START}T00:00:00Z`),
            },
          })
        }
      }
    }
  })
  return { created: true }
}
