import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type {
  BarbershopPageResponse,
  BarbershopSearchResult,
  MeResponse,
  PlatformServicesResponse,
} from '@shavey/contracts'
import { renderRoute, waitUntil } from '@/test/render'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

const navalhaId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'
const capitalId = '1c7a7b63-7b9f-4a8f-8e54-3b4d2c1e0f22'

const me: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé', email: 'ze@exemplo.com', phone: '11987654321' },
  managedBarbershops: [],
  memberships: [],
}

const navalha: BarbershopSearchResult = {
  id: navalhaId,
  name: 'Navalha',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
}
const capital: BarbershopSearchResult = { ...navalha, id: capitalId, name: 'Capital', neighborhood: 'Consolação' }

/** Responde a busca como a API: texto acha a Navalha; o chip "corte" acha as duas. */
function api(searches: URLSearchParams[] = []) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me)),
    http.get('*/api/invitations', () => HttpResponse.json({ invitations: [] })),
    http.get('*/api/platform-services', () =>
      HttpResponse.json({ services: [{ key: 'corte', name: 'Corte' }] } satisfies PlatformServicesResponse),
    ),
    http.get('*/api/barbershops/search', ({ request }) => {
      const params = new URL(request.url).searchParams
      searches.push(params)
      if (params.get('service') === 'corte') return HttpResponse.json({ barbershops: [capital, navalha] })
      const q = params.get('q') ?? ''
      return HttpResponse.json({ barbershops: 'bela vista navalha'.includes(q.toLowerCase()) ? [navalha] : [] })
    }),
  )
}

async function search(wrapper: Awaited<ReturnType<typeof renderRoute>>['wrapper'], text: string) {
  await wrapper.get('input[type="search"]').setValue(text)
  await wrapper.get('form[role="search"]').trigger('submit')
}

const results = (wrapper: Awaited<ReturnType<typeof renderRoute>>['wrapper']) =>
  wrapper.find('ul[aria-label="Barbearias encontradas"]')

describe('busca e serviços da plataforma no Início (R1, R2)', () => {
  it('CA1: buscar "bela vista" mostra a Navalha com bairro e cidade, e abre a página dela', async () => {
    api()
    const { wrapper, router } = await renderRoute('/')
    await waitUntil(() => wrapper.find('input[type="search"]').exists())

    await search(wrapper, 'bela vista')
    await waitUntil(() => results(wrapper).exists())

    expect(results(wrapper).text()).toContain('Navalha')
    expect(results(wrapper).text()).toContain('Bela Vista · São Paulo/SP')
    await results(wrapper).get('a').trigger('click')
    await waitUntil(() => router.currentRoute.value.name === 'barbershop-page')
    expect(router.currentRoute.value.params.barbershopId).toBe(navalhaId)
  })

  it('sem resultado, avisa', async () => {
    api()
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.find('input[type="search"]').exists())

    await search(wrapper, 'moema')

    await waitUntil(() => wrapper.text().includes('Nenhuma barbearia encontrada.'))
  })

  it('CA2: tocar no chip "Corte" lista as barbearias que o oferecem; tocar de novo desmarca', async () => {
    const searches: URLSearchParams[] = []
    api(searches)
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.find('ul[aria-label="Serviços"] button').exists())
    const chip = wrapper.get('ul[aria-label="Serviços"] button')

    await chip.trigger('click')
    await waitUntil(() => results(wrapper).exists())

    expect(chip.attributes('aria-pressed')).toBe('true')
    expect(searches.at(-1)?.get('service')).toBe('corte')
    expect(results(wrapper).findAll('li').map((item) => item.find('.font-display').text())).toEqual(['Capital', 'Navalha'])

    await chip.trigger('click')
    await waitUntil(() => !results(wrapper).exists())
    expect(chip.attributes('aria-pressed')).toBe('false')
  })
})

const page: BarbershopPageResponse = {
  barbershop: {
    id: navalhaId,
    name: 'Navalha',
    cep: '01327000',
    street: 'Rua Treze de Maio',
    number: '500',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  },
  services: [
    {
      id: '2d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
      name: 'Corte',
      barbers: [
        { membershipId: '3e9f0a1b-2c3d-4e4f-9a5b-6c7d8e9f0a1b', name: 'Bia', priceCents: 4000, durationMinutes: 30 },
        { membershipId: '4f0a1b2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c', name: 'Léo', priceCents: 5000, durationMinutes: 45 },
      ],
    },
  ],
}

describe('página da barbearia (R3)', () => {
  it('CA3: mostra endereço e, no Corte, Bia R$ 40,00 e Léo R$ 50,00 com a duração de cada um', async () => {
    api()
    server.use(http.get(`*/api/barbershops/${navalhaId}/page`, () => HttpResponse.json(page)))
    const { wrapper } = await renderRoute(`/barbearias/${navalhaId}/pagina`)
    await waitUntil(() => wrapper.text().includes('Rua Treze de Maio, 500'))

    const barbers = wrapper.get('ul[aria-label="Barbeiros que fazem Corte"]').findAll('li').map((item) => item.text())
    expect(barbers[0]).toMatch(/Bia\s*R\$\s40,00\s*· 30 min/)
    expect(barbers[1]).toMatch(/Léo\s*R\$\s50,00\s*· 45 min/)
  })

  it('sem serviço agendável, diz que ainda não há o que agendar', async () => {
    api()
    server.use(http.get(`*/api/barbershops/${navalhaId}/page`, () => HttpResponse.json({ ...page, services: [] })))
    const { wrapper } = await renderRoute(`/barbearias/${navalhaId}/pagina`)

    await waitUntil(() => wrapper.text().includes('Esta barbearia ainda não tem serviços para agendar.'))
  })

  it('barbearia inexistente aparece como não encontrada', async () => {
    api()
    server.use(
      http.get(`*/api/barbershops/${navalhaId}/page`, () =>
        HttpResponse.json({ error: 'BARBERSHOP_NOT_FOUND', message: 'Barbearia não encontrada.' }, { status: 404 }),
      ),
    )
    const { wrapper } = await renderRoute(`/barbearias/${navalhaId}/pagina`)

    await waitUntil(() => wrapper.text().includes('Barbearia não encontrada.'))
  })
})
