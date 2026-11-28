import { describe, expect, it } from 'vitest'
import {
  bookableServices,
  normalizeText,
  platformServices,
  searchBarbershops,
  type BookableBarbershop,
  type PageService,
} from './discovery'

const navalha: BookableBarbershop = {
  id: 'navalha',
  name: 'Navalha',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  serviceNames: ['Corte', 'Barba'],
}
const capital: BookableBarbershop = {
  id: 'capital',
  name: 'Barbearia Capital',
  neighborhood: 'Consolação',
  city: 'São Paulo',
  state: 'SP',
  serviceNames: ['corte', 'Sobrancelha'],
}
const shops = [navalha, capital]

describe('normalizeText', () => {
  it('ignora maiúsculas, acentos e espaços sobrando', () => {
    expect(normalizeText('  Consolação   Sul ')).toBe('consolacao sul')
  })
})

describe('searchBarbershops (R1)', () => {
  it.each([['bela vista'], ['navalha'], ['NAVALHA'], ['Bêla']])('CA1: acha a Navalha buscando "%s"', (q) => {
    expect(searchBarbershops(shops, { q }).map((shop) => shop.id)).toEqual(['navalha'])
  })

  it('acha por cidade, sem acento, em ordem de nome', () => {
    expect(searchBarbershops(shops, { q: 'sao paulo' }).map((shop) => shop.id)).toEqual(['capital', 'navalha'])
  })

  it('acha pelo bairro com acento digitado sem acento', () => {
    expect(searchBarbershops(shops, { q: 'consolacao' }).map((shop) => shop.id)).toEqual(['capital'])
  })

  it('CA2: o chip "Corte" lista as barbearias com "Corte" ou "corte"', () => {
    expect(searchBarbershops(shops, { serviceKey: 'corte' }).map((shop) => shop.id)).toEqual(['capital', 'navalha'])
  })

  it('combina texto e serviço', () => {
    expect(searchBarbershops(shops, { q: 'navalha', serviceKey: 'sobrancelha' })).toEqual([])
  })
})

describe('platformServices (R2)', () => {
  it('CA2: agrupa pelo nome normalizado e mostra a grafia mais comum', () => {
    const third = { ...navalha, id: 'terceira', serviceNames: ['corte'] }

    expect(platformServices([navalha, capital, third])).toEqual([
      { key: 'barba', name: 'Barba' },
      { key: 'corte', name: 'corte' },
      { key: 'sobrancelha', name: 'Sobrancelha' },
    ])
  })

  it('no empate de grafias, prefere a que começa com maiúscula', () => {
    expect(platformServices(shops).find((service) => service.key === 'corte')?.name).toBe('Corte')
  })
})

describe('bookableServices (R3)', () => {
  const barber = (name: string, overrides: Partial<PageService['barbers'][number]> = {}) => ({
    membershipId: name.toLowerCase(),
    name,
    isActive: true,
    acceptsAppointments: true,
    ownPriceCents: null,
    ownDurationMinutes: null,
    ...overrides,
  })
  const corte: PageService = {
    id: 'corte',
    name: 'Corte',
    isActive: true,
    priceCents: 4000,
    durationMinutes: 30,
    barbers: [barber('Léo', { ownPriceCents: 5000 }), barber('Bia')],
  }

  it('CA3: cada barbeiro com o preço e a duração que valem para ele, em ordem de nome', () => {
    expect(bookableServices([corte])).toEqual([
      {
        id: 'corte',
        name: 'Corte',
        barbers: [
          { membershipId: 'bia', name: 'Bia', priceCents: 4000, durationMinutes: 30 },
          { membershipId: 'léo', name: 'Léo', priceCents: 5000, durationMinutes: 30 },
        ],
      },
    ])
  })

  it('deixa de fora barbeiro inativo ou sem aceitar agendamentos', () => {
    const service = { ...corte, barbers: [barber('Léo', { isActive: false }), barber('Bia', { acceptsAppointments: false })] }
    expect(bookableServices([service])).toEqual([])
  })

  it('deixa de fora serviço inativo', () => {
    expect(bookableServices([{ ...corte, isActive: false }])).toEqual([])
  })
})
