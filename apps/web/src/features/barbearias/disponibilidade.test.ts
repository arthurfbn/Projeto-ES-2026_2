import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Availability, MeResponse, OwnMembershipResponse } from '@shavey/contracts'
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
const membershipId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e31'
const h = (hours: number) => hours * 60

function ownMembership(change: Partial<OwnMembershipResponse['membership']> = {}): OwnMembershipResponse {
  return {
    membership: {
      id: membershipId,
      barbershop: {
        id: '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11',
        name: 'Barbearia do Zé',
        cep: '01310100',
        street: 'Avenida Paulista',
        number: '1578',
        complement: null,
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      hiredAt: '2026-11-21T13:00:00.000Z',
      approvedBy: { name: 'Zé Navalha' },
      isExclusive: false,
      acceptsAppointments: true,
      isActive: true,
      shift: [{ weekday: 1, startMinute: h(9), endMinute: h(18) }],
      ...change,
    },
  }
}

const segunda10as12: Availability = {
  id: '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e51',
  weekday: 1,
  startMinute: h(10),
  endMinute: h(12),
  validFrom: '2026-11-30',
  validUntil: null,
}

/** API falsa com estado; `reject` devolve o erro dado no POST (ex.: 409 do R19/R20). */
function api(options: { membership?: OwnMembershipResponse; existing?: Availability[]; reject?: object } = {}) {
  let availabilities = [...(options.existing ?? [])]
  const calls: Array<{ method: string; body?: unknown }> = []
  const base = `*/api/memberships/${membershipId}/availability`
  server.use(
    http.get('*/api/me', () => HttpResponse.json(ze)),
    http.get(`*/api/memberships/${membershipId}`, () => HttpResponse.json(options.membership ?? ownMembership())),
    http.get(base, () => HttpResponse.json({ availabilities })),
    http.post(base, async ({ request }) => {
      const body = (await request.json()) as Omit<Availability, 'id'>
      calls.push({ method: 'POST', body })
      if (options.reject) return HttpResponse.json(options.reject, { status: 409 })
      const created = { ...body, id: `0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e6${availabilities.length}` }
      availabilities = [...availabilities, created]
      return HttpResponse.json({ availability: created }, { status: 201 })
    }),
    http.delete(`${base}/:id`, ({ params }) => {
      calls.push({ method: 'DELETE' })
      availabilities = availabilities.filter((a) => a.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return calls
}

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

const section = (wrapper: Wrapper) => wrapper.get('[data-testid="availability"]')

function input(wrapper: Wrapper, label: string) {
  const found = section(wrapper).find(`[aria-label="${label}"]`)
  if (!found.exists()) throw new Error(`campo ${label} não encontrado`)
  return found
}

async function fill(wrapper: Wrapper, values: { day?: string; start?: string; end?: string; from?: string; until?: string }) {
  if (values.day) await input(wrapper, 'Dia da semana').setValue(values.day)
  if (values.start) await input(wrapper, 'Início').setValue(values.start)
  if (values.end) await input(wrapper, 'Fim').setValue(values.end)
  if (values.from) await input(wrapper, 'Vale a partir de').setValue(values.from)
  if (values.until !== undefined) await input(wrapper, 'Até (opcional)').setValue(values.until)
}

async function open(wrapper: Wrapper) {
  await waitUntil(() => wrapper.find('[data-testid="availability"]').exists() && wrapper.text().includes('Abrir horário'))
}

describe('disponibilidade na página do vínculo (R17–R20)', () => {
  it('lista as janelas com dia, horário e vigência', async () => {
    api({ existing: [{ ...segunda10as12, validUntil: '2026-12-31' }] })
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)

    expect(section(wrapper).text()).toContain('Segunda · 10:00–12:00')
    expect(section(wrapper).text()).toContain('de 30/11/2026 até 31/12/2026')
  })

  it('CA16: cadastra seg 10:00–12:00 e a janela aparece na lista', async () => {
    const calls = api()
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)

    await fill(wrapper, { day: '1', start: '10:00', end: '12:00', from: '2026-11-30' })
    await section(wrapper).get('form').trigger('submit')
    await waitUntil(() => section(wrapper).text().includes('Segunda · 10:00–12:00'))

    expect(calls).toEqual([
      {
        method: 'POST',
        body: { weekday: 1, startMinute: h(10), endMinute: h(12), validFrom: '2026-11-30', validUntil: null },
      },
    ])
    expect(section(wrapper).text()).toContain('a partir de 30/11/2026')
  })

  it('CA16: mostra "fora do turno" quando a API recusa', async () => {
    const message = 'Fora do turno permitido pelo gerente.'
    api({ reject: { error: 'OUTSIDE_SHIFT', message, fields: { endMinute: message } } })
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)

    await fill(wrapper, { day: '1', start: '17:00', end: '19:00', from: '2026-11-30' })
    await section(wrapper).get('form').trigger('submit')
    await waitUntil(() => section(wrapper).text().includes(message))
  })

  it('CA17: mostra a sobreposição quando a API recusa', async () => {
    const message = 'Você já atende nesse horário, nesta ou em outra barbearia.'
    api({ reject: { error: 'OVERLAPPING_AVAILABILITY', message, fields: { endMinute: message } } })
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)

    await fill(wrapper, { day: '1', start: '11:00', end: '13:00', from: '2026-11-30' })
    await section(wrapper).get('form').trigger('submit')
    await waitUntil(() => section(wrapper).text().includes(message))
  })

  it('R18: início depois do fim aparece sem chamar a API', async () => {
    const calls = api()
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)

    await fill(wrapper, { day: '1', start: '12:00', end: '10:00', from: '2026-11-30' })
    await section(wrapper).get('form').trigger('submit')
    await settle()

    expect(section(wrapper).text()).toContain('Confira os horários')
    expect(calls).toEqual([])
  })

  it('a vigência começa hoje por padrão', async () => {
    api()
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)

    expect((input(wrapper, 'Vale a partir de').element as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('o barbeiro remove uma janela', async () => {
    const calls = api({ existing: [segunda10as12] })
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await open(wrapper)
    await waitUntil(() => section(wrapper).text().includes('Segunda · 10:00–12:00'))

    const remove = section(wrapper)
      .findAll('button')
      .find((b) => b.text() === 'Remover')
    await remove?.trigger('click')
    await waitUntil(() => section(wrapper).text().includes('Você ainda não abriu horários nesta barbearia.'))
    expect(calls).toEqual([{ method: 'DELETE' }])
  })

  it('R17: vínculo inativo não mostra o formulário', async () => {
    api({ membership: ownMembership({ isActive: false }) })
    const { wrapper } = await renderRoute(`/vinculos/${membershipId}`)
    await waitUntil(() => wrapper.find('[data-testid="availability"]').exists())

    expect(section(wrapper).text()).toContain('Este vínculo está inativo')
    expect(section(wrapper).find('form').exists()).toBe(false)
  })
})
