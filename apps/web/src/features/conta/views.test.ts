import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BarbershopResponse, MeResponse } from '@shavey/contracts'
import { renderRoute, waitUntil } from '@/test/render'
import { VIEW_STORAGE_KEY } from '@/stores/view'

const navalha = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'
const capital = '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f'

// CA4: gerente da Navalha e barbeiro da Capital.
const ze: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé Navalha', email: 'ze@exemplo.com', phone: '11987654321' },
  barbershops: [
    { barbershopId: capital, barbershopName: 'Capital', manager: false, barber: true },
    { barbershopId: navalha, barbershopName: 'Navalha', manager: true, barber: false },
  ],
}

function shop(id: string, name: string, roles: BarbershopResponse['roles']): BarbershopResponse {
  return {
    barbershop: {
      id,
      name,
      cep: '01310100',
      street: 'Avenida Paulista',
      number: '1578',
      complement: null,
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    roles,
  }
}

const server = setupServer(
  http.get('*/api/health', () => HttpResponse.json({ status: 'ok', database: 'up', version: 'test' })),
  http.get('*/api/me', () => HttpResponse.json(ze)),
  http.get(`*/api/barbershops/${navalha}`, () =>
    HttpResponse.json(shop(navalha, 'Navalha', { manager: true, barber: false })),
  ),
  http.get(`*/api/barbershops/${capital}`, () =>
    HttpResponse.json(shop(capital, 'Capital', { manager: false, barber: true })),
  ),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

const switcher = (wrapper: Wrapper) => wrapper.get('[data-testid="view-switcher"]')
const menuOptions = (wrapper: Wrapper) => wrapper.findAll('[aria-label="Trocar de visão"] button').map((b) => b.text())

describe('seletor de visão (R5, R6)', () => {
  it('CA4: gerente de A e barbeiro de B vê Cliente, Gerente·A e Barbeiro·B', async () => {
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.find('[data-testid="view-switcher"]').exists())

    await switcher(wrapper).trigger('click')

    expect(menuOptions(wrapper)).toEqual(['✓Cliente', 'Barbeiro · Capital', 'Gerente · Navalha'])
  })

  it('escolher Gerente·A abre a barbearia A, mostra a visão atual e lembra a escolha', async () => {
    const { wrapper, router } = await renderRoute('/')
    await waitUntil(() => wrapper.find('[data-testid="view-switcher"]').exists())
    await switcher(wrapper).trigger('click')

    const gerente = wrapper.findAll('[aria-label="Trocar de visão"] button').find((b) => b.text().includes('Navalha'))
    await gerente?.trigger('click')
    await waitUntil(() => wrapper.text().includes('Avenida Paulista'))

    expect(router.currentRoute.value.params.barbershopId).toBe(navalha)
    expect(switcher(wrapper).text()).toContain('Gerente · Navalha')
    expect(JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) ?? 'null')).toEqual({ kind: 'manager', barbershopId: navalha })
  })

  it('visão salva de um perfil que o usuário não tem mais volta para Cliente', async () => {
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ kind: 'manager', barbershopId: capital }))
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.find('[data-testid="view-switcher"]').exists())

    expect(switcher(wrapper).text()).toContain('Cliente')
    expect(wrapper.text()).toContain('Visão: Cliente')
  })

  it('visitante não vê o seletor', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })))
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Criar conta'))

    expect(wrapper.find('[data-testid="view-switcher"]').exists()).toBe(false)
  })

  it('ao sair, a visão volta para Cliente', async () => {
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ kind: 'barber', barbershopId: capital }))
    server.use(http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })))
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Visão: Barbeiro · Capital'))

    await wrapper.findAll('button').find((b) => b.text() === 'Sair')?.trigger('click')
    await waitUntil(() => wrapper.text().includes('Criar conta'))

    expect(JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) ?? 'null')).toEqual({ kind: 'client' })
  })
})
