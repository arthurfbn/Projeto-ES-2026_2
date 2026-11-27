import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { AppointmentResponse, BarbershopPageResponse, MeResponse, SlotsResponse } from '@shavey/contracts'
import { renderRoute, waitUntil } from '@/test/render'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
  vi.useRealTimers()
})
afterAll(() => server.close())

const shopId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'
const serviceId = '2d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a'
const bia = { membershipId: '3e9f0a1b-2c3d-4e4f-9a5b-6c7d8e9f0a1b', name: 'Bia', priceCents: 4000, durationMinutes: 30 }
const leo = { membershipId: '4f0a1b2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c', name: 'Léo', priceCents: 5000, durationMinutes: 30 }

const me: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé', email: 'ze@exemplo.com', phone: '11987654321' },
  managedBarbershops: [],
  memberships: [],
}

const page: BarbershopPageResponse = {
  barbershop: {
    id: shopId,
    name: 'Navalha',
    cep: '01327000',
    street: 'Rua Treze de Maio',
    number: '500',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  },
  services: [{ id: serviceId, name: 'Corte', barbers: [bia, leo] }],
}

/** "Qualquer barbeiro": 10:00 vai para a Bia, 10:30 para o Léo. */
const anySlots: SlotsResponse = {
  date: '2026-11-30',
  slots: [
    { startsAt: '2026-11-30T13:00:00.000Z', barber: bia },
    { startsAt: '2026-11-30T13:30:00.000Z', barber: leo },
  ],
  fromPriceCents: 4000,
  pricesDiffer: true,
}

function api(options: { book?: () => Response; requests?: unknown[] } = {}) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me)),
    http.get(`*/api/barbershops/${shopId}/page`, () => HttpResponse.json(page)),
    http.get(`*/api/barbershops/${shopId}/services/${serviceId}/slots`, () => HttpResponse.json(anySlots)),
    http.post(`*/api/barbershops/${shopId}/appointments`, async ({ request }) => {
      options.requests?.push(await request.json())
      if (options.book) return options.book()
      const body: AppointmentResponse = {
        appointment: {
          id: '5a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',
          barbershopId: shopId,
          serviceId,
          barber: { membershipId: bia.membershipId, name: 'Bia' },
          startsAt: '2026-11-30T13:00:00.000Z',
          endsAt: '2026-11-30T13:30:00.000Z',
          priceCents: 4000,
          durationMinutes: 30,
          paymentMethod: 'on_site',
          status: 'confirmed',
        },
      }
      return HttpResponse.json(body, { status: 201 })
    }),
  )
}

async function openBooking() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-30T08:00:00-03:00'))
  const { wrapper } = await renderRoute(`/barbearias/${shopId}/pagina`)
  await waitUntil(() => wrapper.text().includes('Agendar'))
  await wrapper.findAll('button').find((button) => button.text() === 'Agendar')?.trigger('click')
  await waitUntil(() => wrapper.find('ul[aria-label="Horários livres"]').exists())
  return wrapper
}

const slotButton = (wrapper: Awaited<ReturnType<typeof openBooking>>, time: string) =>
  wrapper.get('ul[aria-label="Horários livres"]').findAll('button').find((button) => button.text() === time)

describe('agendar pagando no local (R9–R11)', () => {
  it('"qualquer barbeiro" mostra "a partir de" e, ao escolher 10:00, quem atende e o preço antes de confirmar', async () => {
    api()
    const wrapper = await openBooking()

    expect(wrapper.text()).toContain('a partir de R$')
    await slotButton(wrapper, '10:00')?.trigger('click')

    const summary = wrapper.get('[data-testid="booking-summary"]').text()
    expect(summary).toContain('Bia')
    expect(summary).toMatch(/R\$\s40,00/)
    expect(summary).toContain('seg 30/11 às 10:00')
  })

  it('CA7: confirma pagando no local e mostra o horário marcado', async () => {
    const requests: unknown[] = []
    api({ requests })
    const wrapper = await openBooking()

    await slotButton(wrapper, '10:00')?.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Confirmar agendamento')?.trigger('click')
    await waitUntil(() => wrapper.text().includes('Horário marcado.'))

    expect(requests).toEqual([{ serviceId, startsAt: '2026-11-30T13:00:00.000Z', paymentMethod: 'on_site' }])
    expect(wrapper.get('[role="status"]').text()).toMatch(/Corte com Bia.*10:00.*R\$\s40,00, pagamento no local/)
  })

  it('CA8: horário tomado por outro cliente mostra "não está mais livre"', async () => {
    api({
      book: () =>
        HttpResponse.json(
          { error: 'SLOT_NOT_AVAILABLE', message: 'Esse horário não está mais livre. Escolha outro.' },
          { status: 409 },
        ),
    })
    const wrapper = await openBooking()

    await slotButton(wrapper, '10:00')?.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Confirmar agendamento')?.trigger('click')

    await waitUntil(() => wrapper.text().includes('Esse horário não está mais livre. Escolha outro.'))
    expect(wrapper.find('[data-testid="booking-summary"]').exists()).toBe(false)
  })
})
