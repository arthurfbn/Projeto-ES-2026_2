import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BarbershopResponse, MeResponse, Service } from '@shavey/contracts'
import { renderRoute, settle, waitUntil } from '@/test/render'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

const ze: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé Navalha', email: 'ze@exemplo.com', phone: '11987654321' },
  managedBarbershops: [],
  memberships: [],
}
const shopId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'
const servicesUrl = `*/api/barbershops/${shopId}/services`

function shop(roles: BarbershopResponse['roles']): BarbershopResponse {
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

/** API falsa de serviços, com estado: o que a tela cria e altera aparece na próxima listagem. */
function servicesApi(initial: Service[] = []) {
  const services = [...initial]
  const calls: Array<{ method: string; body: unknown }> = []
  server.use(
    http.get('*/api/me', () => HttpResponse.json(ze)),
    http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop({ manager: true, barber: false }))),
    http.get(servicesUrl, () => HttpResponse.json({ services })),
    http.post(servicesUrl, async ({ request }) => {
      const body = (await request.json()) as Omit<Service, 'id' | 'isActive'>
      calls.push({ method: 'POST', body })
      const created: Service = { ...body, id: `0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e2${services.length}`, isActive: true }
      services.push(created)
      return HttpResponse.json({ service: created }, { status: 201 })
    }),
    http.patch(`${servicesUrl}/:serviceId`, async ({ request, params }) => {
      const body = (await request.json()) as Partial<Service>
      calls.push({ method: 'PATCH', body })
      const index = services.findIndex((s) => s.id === params.serviceId)
      const updated = { ...services[index], ...body } as Service
      services[index] = updated
      return HttpResponse.json({ service: updated })
    }),
  )
  return calls
}

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

function input(wrapper: Wrapper, label: string) {
  const field = wrapper.findAll('label').find((l) => l.text() === label)
  if (!field) throw new Error(`campo ${label} não encontrado`)
  return wrapper.get<HTMLInputElement>(`#${field.attributes('for')}`)
}

function button(wrapper: Wrapper, text: string) {
  const found = wrapper.findAll('button').find((b) => b.text() === text)
  if (!found) throw new Error(`botão ${text} não encontrado`)
  return found
}

async function fillService(wrapper: Wrapper, values: { name?: string; price?: string; duration?: string }) {
  if (values.name !== undefined) await input(wrapper, 'Nome do serviço').setValue(values.name)
  if (values.price !== undefined) await input(wrapper, 'Preço (R$)').setValue(values.price)
  if (values.duration !== undefined) await input(wrapper, 'Duração (min)').setValue(values.duration)
}

const corte: Service = {
  id: '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e20',
  name: 'Corte',
  priceCents: 4000,
  durationMinutes: 30,
  isActive: true,
}

describe('serviços na página da barbearia (gerente)', () => {
  it('mostra quando ainda não há serviços', async () => {
    servicesApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Nenhum serviço cadastrado ainda.'))
  })

  it('CA7: 20 min dá erro no campo, sem chamar a API', async () => {
    const calls = servicesApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Novo serviço'))

    await fillService(wrapper, { name: 'Corte', price: '40,00', duration: '20' })
    await wrapper.get('form[aria-label="Novo serviço"]').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('A duração precisa ser de 15 em 15 minutos (mínimo 15).')
    expect(calls).toEqual([])
  })

  it('CA7: cria 30 min e R$ 40,00 e o serviço aparece na lista', async () => {
    const calls = servicesApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Novo serviço'))

    await fillService(wrapper, { name: 'Corte', price: '40,00', duration: '30' })
    await wrapper.get('form[aria-label="Novo serviço"]').trigger('submit')
    await waitUntil(() => wrapper.find('[data-testid="service-list"]').text().includes('Corte'))

    expect(calls).toEqual([{ method: 'POST', body: { name: 'Corte', priceCents: 4000, durationMinutes: 30 } }])
    const list = wrapper.get('[data-testid="service-list"]').text()
    expect(list).toMatch(/R\$\s40,00/)
    expect(list).toContain('30 min')
  })

  it('CA7: desativar mantém o serviço na lista, marcado como inativo; reativar volta', async () => {
    const calls = servicesApi([corte])
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Desativar'))

    await button(wrapper, 'Desativar').trigger('click')
    await waitUntil(() => wrapper.text().includes('Inativo'))
    expect(wrapper.get('[data-testid="service-list"]').text()).toContain('Corte')
    expect(calls).toEqual([{ method: 'PATCH', body: { isActive: false } }])

    await button(wrapper, 'Reativar').trigger('click')
    await waitUntil(() => !wrapper.text().includes('Inativo'))
  })

  it('gerente altera nome, preço e duração', async () => {
    const calls = servicesApi([corte])
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Editar'))

    await button(wrapper, 'Editar').trigger('click')
    const form = wrapper.get('form[aria-label="Editar Corte"]')
    expect(input(wrapper, 'Preço (R$)').element.value).toBe('40,00')
    await fillService(wrapper, { name: 'Corte degradê', price: '55', duration: '45' })
    await form.trigger('submit')
    await waitUntil(() => wrapper.get('[data-testid="service-list"]').text().includes('Corte degradê'))

    expect(calls).toEqual([
      { method: 'PATCH', body: { name: 'Corte degradê', priceCents: 5500, durationMinutes: 45 } },
    ])
    expect(wrapper.get('[data-testid="service-list"]').text()).toContain('45 min')
  })
})

describe('serviços para quem não é gerente', () => {
  it('barbeiro da casa não vê a gestão de serviços', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(ze)),
      http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop({ manager: false, barber: true }))),
    )
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Barbearia do Zé'))

    expect(wrapper.text()).not.toContain('Serviços')
  })
})
