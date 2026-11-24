import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BarbershopResponse, MeResponse, Membership, WeeklyWindow } from '@shavey/contracts'
import { renderRoute, waitUntil } from '@/test/render'

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
const membershipsUrl = `*/api/barbershops/${shopId}/memberships`

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

const zeMembership: Membership = {
  id: membershipId,
  barber: { id: ze.user.id, name: 'Zé Navalha' },
  hiredAt: '2026-11-21T13:00:00.000Z',
  isExclusive: false,
  acceptsAppointments: true,
  isActive: true,
  shift: [],
}

/** API falsa de vínculos com estado; `rejectShift` simula o 409 do R21. */
function teamApi(options: { rejectShift?: boolean } = {}) {
  let membership = { ...zeMembership }
  const calls: Array<{ method: string; url: string; body: unknown }> = []
  server.use(
    http.get('*/api/me', () => HttpResponse.json(ze)),
    http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop)),
    http.get(`*/api/barbershops/${shopId}/services`, () => HttpResponse.json({ services: [] })),
    http.get(membershipsUrl, () => HttpResponse.json({ memberships: [membership] })),
    http.put(`${membershipsUrl}/:id/shift`, async ({ request }) => {
      const body = (await request.json()) as { windows: WeeklyWindow[] }
      calls.push({ method: 'PUT', url: 'shift', body })
      if (options.rejectShift) {
        const message = 'Há disponibilidade fora do novo turno.'
        return HttpResponse.json(
          { error: 'AVAILABILITY_OUTSIDE_SHIFT', message, fields: { windows: message } },
          { status: 409 },
        )
      }
      membership = { ...membership, shift: body.windows }
      return HttpResponse.json({ membership })
    }),
    http.patch(`${membershipsUrl}/:id`, async ({ request }) => {
      const body = (await request.json()) as Partial<Membership>
      calls.push({ method: 'PATCH', url: 'membership', body })
      membership = { ...membership, ...body }
      return HttpResponse.json({ membership })
    }),
  )
  return calls
}

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

function button(wrapper: Wrapper, text: string) {
  const found = wrapper.findAll('button').find((b) => b.text() === text)
  if (!found) throw new Error(`botão ${text} não encontrado`)
  return found
}

function team(wrapper: Wrapper) {
  return wrapper.get('[data-testid="team"]').text()
}

/** Marca o dia no editor de turno e preenche início e fim. */
async function setDay(wrapper: Wrapper, day: string, start: string, end: string) {
  await wrapper.get(`input[aria-label="${day}"]`).setValue(true)
  await wrapper.get(`input[aria-label="Início ${day}"]`).setValue(start)
  await wrapper.get(`input[aria-label="Fim ${day}"]`).setValue(end)
}

const h = (hours: number) => hours * 60

describe('equipe na página da barbearia (gerente)', () => {
  it('lista o vínculo com nome e "Sem turno"', async () => {
    teamApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.find('[data-testid="team"]').exists() && team(wrapper).includes('Zé Navalha'))

    expect(team(wrapper)).toContain('Sem turno')
  })

  it('CA14: define turno seg–sáb 09:00–18:00 e ele aparece no vínculo', async () => {
    const calls = teamApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Definir turno'))

    await button(wrapper, 'Definir turno').trigger('click')
    for (const day of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']) {
      await setDay(wrapper, day, '09:00', '18:00')
    }
    await wrapper.get('form[aria-label="Turno de Zé Navalha"]').trigger('submit')
    await waitUntil(() => team(wrapper).includes('Seg–Sáb 09:00–18:00'))

    expect(calls).toEqual([
      {
        method: 'PUT',
        url: 'shift',
        body: { windows: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: h(9), endMinute: h(18) })) },
      },
    ])
  })

  it('aponta início depois do fim sem chamar a API', async () => {
    const calls = teamApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Definir turno'))

    await button(wrapper, 'Definir turno').trigger('click')
    await setDay(wrapper, 'Segunda', '18:00', '09:00')
    await wrapper.get('form[aria-label="Turno de Zé Navalha"]').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Segunda: o início precisa ser antes do fim.'))

    expect(calls).toEqual([])
  })

  it('CA18: mostra "Há disponibilidade fora do novo turno." quando a API recusa', async () => {
    teamApi({ rejectShift: true })
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Definir turno'))

    await button(wrapper, 'Definir turno').trigger('click')
    await setDay(wrapper, 'Segunda', '09:00', '15:00')
    await wrapper.get('form[aria-label="Turno de Zé Navalha"]').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Há disponibilidade fora do novo turno.'))
    expect(team(wrapper)).not.toContain('Seg 09:00–15:00')
  })

  it('remove o turno', async () => {
    const calls = teamApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Definir turno'))
    await button(wrapper, 'Definir turno').trigger('click')
    await setDay(wrapper, 'Segunda', '09:00', '18:00')
    await wrapper.get('form[aria-label="Turno de Zé Navalha"]').trigger('submit')
    await waitUntil(() => team(wrapper).includes('Seg 09:00–18:00'))

    await button(wrapper, 'Remover turno').trigger('click')
    await waitUntil(() => team(wrapper).includes('Sem turno'))
    expect(calls.at(-1)).toEqual({ method: 'PUT', url: 'shift', body: { windows: [] } })
  })

  it('pausa agendamentos e desativa o vínculo', async () => {
    const calls = teamApi()
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Pausar agendamentos'))

    await button(wrapper, 'Pausar agendamentos').trigger('click')
    await waitUntil(() => team(wrapper).includes('Não aceita agendamentos'))
    await button(wrapper, 'Desativar vínculo').trigger('click')
    await waitUntil(() => team(wrapper).includes('Inativo'))

    expect(calls).toEqual([
      { method: 'PATCH', url: 'membership', body: { acceptsAppointments: false } },
      { method: 'PATCH', url: 'membership', body: { isActive: false } },
    ])
  })
})
