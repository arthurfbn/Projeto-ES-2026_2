import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ApiErrorBody, BarbershopResponse, MeResponse } from '@shavey/contracts'
import { renderRoute, settle, waitUntil } from '@/test/render'

const server = setupServer(
  http.get('*/api/health', () => HttpResponse.json({ status: 'ok', database: 'up', version: 'test' })),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

const ze: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé Navalha', email: 'ze@exemplo.com', phone: '11987654321' },
}

const shopId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'

function shopResponse(roles: BarbershopResponse['roles']): BarbershopResponse {
  return {
    barbershop: {
      id: shopId,
      name: 'Barbearia do Zé',
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

function loggedIn() {
  server.use(http.get('*/api/me', () => HttpResponse.json(ze)))
}

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

function input(wrapper: Wrapper, label: string) {
  const field = wrapper.findAll('label').find((l) => l.text() === label)
  if (!field) throw new Error(`campo ${label} não encontrado`)
  return wrapper.get<HTMLInputElement>(`#${field.attributes('for')}`)
}

async function fill(wrapper: Wrapper, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await input(wrapper, label).setValue(value)
}

const validShop = {
  'Nome da barbearia': 'Barbearia do Zé',
  CEP: '01310100',
  Rua: 'Avenida Paulista',
  Número: '1578',
  Bairro: 'Bela Vista',
  Cidade: 'São Paulo',
  UF: 'sp',
}

describe('criar barbearia', () => {
  it('pede login a quem não entrou na conta', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })))
    const { router } = await renderRoute('/barbearias/nova')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('CA6: aponta CEP com 7 dígitos e UF inexistente nos campos, sem chamar a API', async () => {
    loggedIn()
    let called = false
    server.use(http.post('*/api/barbershops', () => ((called = true), HttpResponse.json({}, { status: 201 }))))
    const { wrapper } = await renderRoute('/barbearias/nova')

    await fill(wrapper, { ...validShop, CEP: '0131010', UF: 'XX' })
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('Informe o CEP com 8 dígitos.')
    expect(wrapper.text()).toContain('Informe a sigla de um estado (ex.: SP).')
    expect(called).toBe(false)
  })

  it('CA5: marcando "eu também atendo", envia o pedido e mostra a barbearia com gerente e barbeiro', async () => {
    loggedIn()
    let sent: unknown
    server.use(
      http.post('*/api/barbershops', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(shopResponse({ manager: true, barber: true }), { status: 201 })
      }),
      http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shopResponse({ manager: true, barber: true }))),
    )
    const { wrapper, router } = await renderRoute('/barbearias/nova')

    await fill(wrapper, validShop)
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await waitUntil(() => router.currentRoute.value.name === 'barbershop' && wrapper.text().includes('Avenida Paulista'))

    expect(sent).toMatchObject({ name: 'Barbearia do Zé', cep: '01310-100', state: 'sp', alsoBarber: true })
    expect(router.currentRoute.value.params).toMatchObject({ barbershopId: shopId })
    expect(wrapper.text()).toContain('Gerente')
    expect(wrapper.text()).toContain('Barbeiro')
    expect(wrapper.text()).toContain('01310-100')
  })

  it('CA5: sem marcar, a barbearia aparece só com o perfil de gerente', async () => {
    loggedIn()
    server.use(http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shopResponse({ manager: true, barber: false }))))
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Barbearia do Zé'))

    expect(wrapper.text()).toContain('Gerente')
    expect(wrapper.text()).not.toContain('Barbeiro')
  })

  it('R14b: mostra o motivo no "eu também atendo" quando a API recusa', async () => {
    loggedIn()
    const message = 'Você tem vínculo exclusivo com outra barbearia.'
    const conflict: ApiErrorBody = { error: 'EXCLUSIVE_MEMBERSHIP_ELSEWHERE', message, fields: { alsoBarber: message } }
    server.use(http.post('*/api/barbershops', () => HttpResponse.json(conflict, { status: 409 })))
    const { wrapper } = await renderRoute('/barbearias/nova')

    await fill(wrapper, validShop)
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await waitUntil(() => wrapper.text().includes(message))
  })

  it('barbearia sem acesso aparece como não encontrada', async () => {
    loggedIn()
    server.use(
      http.get(`*/api/barbershops/${shopId}`, () =>
        HttpResponse.json({ error: 'BARBERSHOP_NOT_FOUND', message: 'Barbearia não encontrada.' }, { status: 404 }),
      ),
    )
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Barbearia não encontrada.'))
  })
})
