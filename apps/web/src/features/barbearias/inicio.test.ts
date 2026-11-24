import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BarbershopResponse, MeResponse, OwnMembershipResponse } from '@shavey/contracts'
import { renderRoute, waitUntil } from '@/test/render'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

const shopA = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'
const shopB = '1c7a7b63-7b9f-4a8f-8e54-3b4d2c1e0f22'
const membershipB = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f'

/** CA4: gerente da Navalha (A) e barbeiro da Capital (B). */
const ze: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé Navalha', email: 'ze@exemplo.com', phone: '11987654321' },
  managedBarbershops: [{ id: shopA, name: 'Navalha' }],
  memberships: [{ id: membershipB, barbershopId: shopB, barbershopName: 'Capital' }],
}

const address = {
  cep: '01310100',
  street: 'Avenida Paulista',
  number: '1578',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
}

const ownMembership: OwnMembershipResponse = {
  membership: {
    id: membershipB,
    barbershop: { id: shopB, name: 'Capital', ...address },
    hiredAt: '2026-11-23T13:00:00.000Z',
    approvedBy: { name: 'Maria Tesoura' },
    isExclusive: true,
    acceptsAppointments: true,
    isActive: true,
    shift: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1080 })),
  },
}

function api(me: MeResponse = ze) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me)),
    http.get('*/api/invitations', () => HttpResponse.json({ invitations: [] })),
  )
}

const carousel = (wrapper: Awaited<ReturnType<typeof renderRoute>>['wrapper'], title: string) =>
  wrapper.find(`ul[aria-label="${title}"]`)

describe('Início sem seletor de visão (R6, CA4; ADR-0022)', () => {
  it('CA4: mostra A em Minhas barbearias e B em Meus vínculos, sem seletor', async () => {
    api()
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Olá, Zé Navalha'))

    expect(carousel(wrapper, 'Minhas barbearias').text()).toContain('Navalha')
    expect(carousel(wrapper, 'Minhas barbearias').text()).not.toContain('Capital')
    expect(carousel(wrapper, 'Meus vínculos').text()).toContain('Capital')
    expect(wrapper.text()).not.toMatch(/Visão|Cliente ·|Gerente ·/)
  })

  it('CA4: tocar em A abre a Gestão de A', async () => {
    api()
    server.use(
      http.get(`*/api/barbershops/${shopA}`, () =>
        HttpResponse.json({
          barbershop: { id: shopA, name: 'Navalha', ...address },
          roles: { manager: true, barber: false },
        } satisfies BarbershopResponse),
      ),
      http.get(`*/api/barbershops/${shopA}/services`, () => HttpResponse.json({ services: [] })),
      http.get(`*/api/barbershops/${shopA}/memberships`, () => HttpResponse.json({ memberships: [] })),
    )
    const { wrapper, router } = await renderRoute('/')
    await waitUntil(() => carousel(wrapper, 'Minhas barbearias').exists())

    await carousel(wrapper, 'Minhas barbearias').get('a').trigger('click')
    await waitUntil(() => router.currentRoute.value.name === 'barbershop')

    expect(router.currentRoute.value.params.barbershopId).toBe(shopA)
  })

  it('CA4: tocar em B mostra o vínculo: contratação, quem aprovou, exclusividade, situação e turno', async () => {
    api()
    server.use(http.get(`*/api/memberships/${membershipB}`, () => HttpResponse.json(ownMembership)))
    const { wrapper, router } = await renderRoute('/')
    await waitUntil(() => carousel(wrapper, 'Meus vínculos').exists())

    await carousel(wrapper, 'Meus vínculos').get('a').trigger('click')
    await waitUntil(() => wrapper.find('[data-testid="membership-facts"]').exists())

    expect(router.currentRoute.value.name).toBe('membership')
    const facts = wrapper.get('[data-testid="membership-facts"]').text()
    expect(facts).toContain('23 de novembro de 2026')
    expect(facts).toContain('Maria Tesoura')
    expect(facts).toContain('Exclusivo desta barbearia')
    expect(facts).toContain('Aceitando')
    expect(facts).toContain('Ativo')
    expect(wrapper.get('[data-testid="membership-shift"]').text()).toBe('Seg–Sáb 09:00–18:00')
  })

  it('vínculo sem turno explica que o barbeiro abre a agenda como quiser', async () => {
    api()
    const noShift = { membership: { ...ownMembership.membership, shift: [] } }
    server.use(http.get(`*/api/memberships/${membershipB}`, () => HttpResponse.json(noShift)))
    const { wrapper } = await renderRoute(`/vinculos/${membershipB}`)

    await waitUntil(() => wrapper.text().includes('Sem turno definido'))
  })

  it('vínculo de outra pessoa aparece como não encontrado', async () => {
    api()
    server.use(
      http.get(`*/api/memberships/${membershipB}`, () =>
        HttpResponse.json({ error: 'MEMBERSHIP_NOT_FOUND', message: 'Vínculo não encontrado.' }, { status: 404 }),
      ),
    )
    const { wrapper } = await renderRoute(`/vinculos/${membershipB}`)

    await waitUntil(() => wrapper.text().includes('Vínculo não encontrado.'))
  })

  it('quem não gerencia nem atende não vê os carrosséis', async () => {
    api({ ...ze, managedBarbershops: [], memberships: [] })
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Olá, Zé Navalha'))

    expect(wrapper.text()).not.toContain('Minhas barbearias')
    expect(wrapper.text()).not.toContain('Meus vínculos')
  })
})

describe('navbar (ADR-0022)', () => {
  it('quem entrou tem Início, Criar barbearia e Sair; Criar barbearia abre o fluxo atual', async () => {
    api()
    const { wrapper, router } = await renderRoute('/')
    await waitUntil(() => wrapper.find('nav[aria-label="Principal"]').exists())

    const nav = wrapper.get('nav[aria-label="Principal"]')
    expect(nav.text()).toContain('Início')
    expect(nav.text()).toContain('Criar barbearia')
    expect(nav.text()).toContain('Sair')

    const create = nav.findAll('a').find((a) => a.text() === 'Criar barbearia')
    await create?.trigger('click')
    await waitUntil(() => router.currentRoute.value.name === 'create-barbershop')
  })

  it('visitante não vê a navbar', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })))
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Criar conta'))

    expect(wrapper.find('nav[aria-label="Principal"]').exists()).toBe(false)
  })
})
