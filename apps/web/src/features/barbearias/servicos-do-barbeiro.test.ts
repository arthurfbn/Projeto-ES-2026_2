import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BarberService, BarbershopResponse, MeResponse, Membership, Service } from '@shavey/contracts'
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
const membershipId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e31'

const shop: BarbershopResponse = {
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
  roles: { manager: true, barber: true },
}

const membership: Membership = {
  id: membershipId,
  barber: { id: ze.user.id, name: 'Zé Navalha' },
  hiredAt: '2026-11-21T13:00:00.000Z',
  isExclusive: false,
  acceptsAppointments: true,
  isActive: true,
  shift: [],
}

const corte: Service = { id: '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e41', name: 'Corte', priceCents: 4000, durationMinutes: 30, isActive: true }
const barba: Service = { id: '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e42', name: 'Barba', priceCents: 2500, durationMinutes: 15, isActive: true }
const pigmentacao: Service = {
  id: '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e43',
  name: 'Pigmentação',
  priceCents: 3000,
  durationMinutes: 30,
  isActive: false,
}

/** API falsa com estado dos serviços do barbeiro; `conflict` simula o 409 de serviço desativado. */
function api(options: { assigned?: BarberService[]; conflict?: boolean } = {}) {
  let assigned = [...(options.assigned ?? [])]
  const calls: Array<{ method: string; serviceId: string; body?: unknown }> = []
  const base = `*/api/barbershops/${shopId}/memberships/${membershipId}/services`
  server.use(
    http.get('*/api/me', () => HttpResponse.json(ze)),
    http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop)),
    http.get(`*/api/barbershops/${shopId}/services`, () => HttpResponse.json({ services: [corte, barba, pigmentacao] })),
    http.get(`*/api/barbershops/${shopId}/memberships`, () => HttpResponse.json({ memberships: [membership] })),
    http.get(base, () => HttpResponse.json({ services: assigned })),
    http.put(`${base}/:serviceId`, async ({ request, params }) => {
      const body = (await request.json()) as { priceCents: number | null; durationMinutes: number | null }
      const serviceId = String(params.serviceId)
      calls.push({ method: 'PUT', serviceId, body })
      if (options.conflict) {
        const message = 'Serviço desativado não pode ser atribuído a barbeiro.'
        return HttpResponse.json({ error: 'SERVICE_INACTIVE', message }, { status: 409 })
      }
      const service = [corte, barba].find((s) => s.id === serviceId) ?? corte
      const saved: BarberService = {
        serviceId,
        name: service.name,
        serviceIsActive: true,
        priceCents: body.priceCents,
        durationMinutes: body.durationMinutes,
        effectivePriceCents: body.priceCents ?? service.priceCents,
        effectiveDurationMinutes: body.durationMinutes ?? service.durationMinutes,
      }
      assigned = [...assigned.filter((s) => s.serviceId !== serviceId), saved]
      return HttpResponse.json({ service: saved })
    }),
    http.delete(`${base}/:serviceId`, ({ params }) => {
      calls.push({ method: 'DELETE', serviceId: String(params.serviceId) })
      assigned = assigned.filter((s) => s.serviceId !== params.serviceId)
      return new HttpResponse(null, { status: 204 })
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

const panel = (wrapper: Wrapper) => wrapper.get('[data-testid="barber-services"]')

/** Botão dentro do painel do barbeiro (a seção Serviços da barbearia também tem "Editar"). */
function panelButton(wrapper: Wrapper, text: string) {
  const found = panel(wrapper)
    .findAll('button')
    .find((b) => b.text() === text)
  if (!found) throw new Error(`botão ${text} não encontrado no painel`)
  return found
}

async function openPanel(wrapper: Wrapper) {
  await waitUntil(() => wrapper.findAll('button').some((b) => b.text() === 'Serviços do barbeiro'))
  await button(wrapper, 'Serviços do barbeiro').trigger('click')
  await waitUntil(() => wrapper.find('[data-testid="barber-services"]').exists() && wrapper.text().includes('Adicionar ao barbeiro'))
}

describe('serviços do barbeiro (R16)', () => {
  it('CA15: com R$ 50 próprio no Corte, o barbeiro mostra R$ 50 e 30 min', async () => {
    const calls = api()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await openPanel(wrapper)

    await wrapper.get('select').setValue(corte.id)
    await input(wrapper, 'Preço próprio (R$)').setValue('50')
    await wrapper.get('form[aria-label="Adicionar serviço ao barbeiro"]').trigger('submit')
    await waitUntil(() => /R\$\s50,00 · 30 min/.test(panel(wrapper).text()))

    expect(calls).toEqual([{ method: 'PUT', serviceId: corte.id, body: { priceCents: 5000, durationMinutes: null } }])
  })

  it('só oferece serviços ativos que o barbeiro ainda não realiza', async () => {
    api({
      assigned: [
        {
          serviceId: barba.id,
          name: 'Barba',
          serviceIsActive: true,
          priceCents: null,
          durationMinutes: null,
          effectivePriceCents: 2500,
          effectiveDurationMinutes: 15,
        },
      ],
    })
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await openPanel(wrapper)

    const options = wrapper.findAll('select option').map((option) => option.text())
    expect(options).toContain('Corte')
    expect(options).not.toContain('Barba')
    expect(options).not.toContain('Pigmentação')
  })

  it('duração própria de 20 min dá erro no campo, sem chamar a API', async () => {
    const calls = api()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await openPanel(wrapper)

    await wrapper.get('select').setValue(corte.id)
    await input(wrapper, 'Duração própria (min)').setValue('20')
    await wrapper.get('form[aria-label="Adicionar serviço ao barbeiro"]').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('A duração precisa ser de 15 em 15 minutos (mínimo 15).')
    expect(calls).toEqual([])
  })

  it('mostra a recusa da API (serviço desativado no meio do caminho)', async () => {
    api({ conflict: true })
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await openPanel(wrapper)

    await wrapper.get('select').setValue(corte.id)
    await wrapper.get('form[aria-label="Adicionar serviço ao barbeiro"]').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Serviço desativado não pode ser atribuído a barbeiro.'))
  })

  it('edita os valores próprios e remove o serviço do barbeiro', async () => {
    const calls = api({
      assigned: [
        {
          serviceId: corte.id,
          name: 'Corte',
          serviceIsActive: true,
          priceCents: 5000,
          durationMinutes: null,
          effectivePriceCents: 5000,
          effectiveDurationMinutes: 30,
        },
      ],
    })
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await openPanel(wrapper)
    await waitUntil(() => panel(wrapper).text().includes('(próprio)'))

    await panelButton(wrapper, 'Editar').trigger('click')
    expect(input(wrapper, 'Preço próprio (R$)').element.value).toBe('50,00')
    await input(wrapper, 'Preço próprio (R$)').setValue('')
    await input(wrapper, 'Duração própria (min)').setValue('45')
    await wrapper.get('form[aria-label="Editar Corte do barbeiro"]').trigger('submit')
    await waitUntil(() => /R\$\s40,00 · 45 min/.test(panel(wrapper).text()))

    await panelButton(wrapper, 'Remover').trigger('click')
    await waitUntil(() => panel(wrapper).text().includes('Este barbeiro ainda não tem serviços.'))

    expect(calls).toEqual([
      { method: 'PUT', serviceId: corte.id, body: { priceCents: null, durationMinutes: 45 } },
      { method: 'DELETE', serviceId: corte.id },
    ])
  })
})
