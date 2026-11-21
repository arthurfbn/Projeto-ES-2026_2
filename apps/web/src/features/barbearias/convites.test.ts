import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BarbershopResponse, MeResponse, ReceivedInvitation } from '@shavey/contracts'
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
}
const shopId = '0b6f6a52-6a8e-4f7e-9d43-2a3c1b0d9e11'
const invitationsUrl = `*/api/barbershops/${shopId}/invitations`

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

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

function input(wrapper: Wrapper, label: string) {
  const field = wrapper.findAll('label').find((l) => l.text() === label)
  if (!field) throw new Error(`campo ${label} não encontrado`)
  return wrapper.get<HTMLInputElement>(`#${field.attributes('for')}`)
}

function radio(wrapper: Wrapper, label: string) {
  const option = wrapper.findAll('label').find((l) => l.text() === label)
  if (!option) throw new Error(`opção ${label} não encontrada`)
  return option.get<HTMLInputElement>('input[type="radio"]')
}

/** Gerente na página da barbearia; registra o que a tela envia ao convidar. */
function managerApi(respond: (body: unknown) => Response) {
  const calls: unknown[] = []
  server.use(
    http.get('*/api/me', () => HttpResponse.json(ze)),
    http.get('*/api/invitations', () => HttpResponse.json({ invitations: [] })),
    http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop({ manager: true, barber: false }))),
    http.get(`*/api/barbershops/${shopId}/services`, () => HttpResponse.json({ services: [] })),
    http.post(invitationsUrl, async ({ request }) => {
      const body = await request.json()
      calls.push(body)
      return respond(body)
    }),
  )
  return calls
}

const sentBarber = (body: unknown) =>
  HttpResponse.json(
    {
      invitation: {
        id: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        kind: 'barber',
        isExclusive: (body as { isExclusive: boolean }).isExclusive,
        status: 'pending',
        expiresAt: '2026-11-28T13:00:00.000Z',
      },
    },
    { status: 201 },
  )

describe('gerente convida para a equipe (R10)', () => {
  it('CA9: convida barbeiro com vínculo exclusivo e vê a confirmação', async () => {
    const calls = managerApi(sentBarber)
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Enviar convite'))

    await input(wrapper, 'E-mail de quem você quer convidar').setValue('Leo@Exemplo.com')
    await input(wrapper, 'Vínculo exclusivo').setValue(true)
    await wrapper.get('form[aria-label="Convidar para a equipe"]').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Convite de barbeiro enviado'))

    expect(calls).toEqual([{ email: 'leo@exemplo.com', kind: 'barber', isExclusive: true }])
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Convite de barbeiro enviado para Leo@Exemplo.com. Vale até 28/11.',
    )
  })

  it('convite de gerente não leva exclusividade e esconde a opção', async () => {
    const calls = managerApi(() =>
      HttpResponse.json(
        {
          invitation: {
            id: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
            kind: 'manager',
            isExclusive: false,
            status: 'pending',
            expiresAt: '2026-11-28T13:00:00.000Z',
          },
        },
        { status: 201 },
      ),
    )
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Enviar convite'))

    await input(wrapper, 'E-mail de quem você quer convidar').setValue('ana@exemplo.com')
    await input(wrapper, 'Vínculo exclusivo').setValue(true)
    await radio(wrapper, 'Gerente').setValue(true)
    await settle()
    expect(wrapper.text()).not.toContain('Vínculo exclusivo')

    await wrapper.get('form[aria-label="Convidar para a equipe"]').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Convite de gerente enviado'))
    expect(calls).toEqual([{ email: 'ana@exemplo.com', kind: 'manager', isExclusive: false }])
  })

  it('CA10: e-mail sem conta mostra "usuário não encontrado" no campo', async () => {
    managerApi(() =>
      HttpResponse.json(
        {
          error: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado. Peça para a pessoa criar a conta no Shavey antes.',
          fields: { email: 'Usuário não encontrado. Peça para a pessoa criar a conta no Shavey antes.' },
        },
        { status: 422 },
      ),
    )
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Enviar convite'))

    await input(wrapper, 'E-mail de quem você quer convidar').setValue('ninguem@exemplo.com')
    await wrapper.get('form[aria-label="Convidar para a equipe"]').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Usuário não encontrado.'))

    expect(wrapper.text()).not.toContain('enviado')
  })

  it('e-mail inválido dá erro no campo, sem chamar a API', async () => {
    const calls = managerApi(sentBarber)
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Enviar convite'))

    await input(wrapper, 'E-mail de quem você quer convidar').setValue('nao-e-email')
    await wrapper.get('form[aria-label="Convidar para a equipe"]').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('Informe um e-mail válido.')
    expect(calls).toEqual([])
  })

  it('barbeiro da casa não vê a área de convites', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(ze)),
      http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop({ manager: false, barber: true }))),
    )
    const { wrapper } = await renderRoute(`/barbearias/${shopId}`)
    await waitUntil(() => wrapper.text().includes('Barbearia do Zé'))

    expect(wrapper.text()).not.toContain('Enviar convite')
  })
})

const pendingInvitation: ReceivedInvitation = {
  id: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  barbershopId: shopId,
  barbershopName: 'Barbearia do Zé',
  kind: 'barber',
  isExclusive: true,
  expiresAt: '2026-11-28T13:00:00.000Z',
}

describe('convidado vê e aceita convites ao entrar (R14)', () => {
  it('mostra o convite pendente na página inicial; aceitar abre a barbearia como barbeiro', async () => {
    let invitations = [pendingInvitation]
    const accepted: string[] = []
    server.use(
      http.get('*/api/me', () => HttpResponse.json(ze)),
      http.get('*/api/invitations', () => HttpResponse.json({ invitations })),
      http.post('*/api/invitations/:invitationId/accept', ({ params }) => {
        accepted.push(String(params.invitationId))
        invitations = []
        return HttpResponse.json({ barbershopId: shopId, kind: 'barber' })
      }),
      http.get(`*/api/barbershops/${shopId}`, () => HttpResponse.json(shop({ manager: false, barber: true }))),
    )
    const { wrapper, router } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Convites'))

    const list = wrapper.get('[data-testid="invitation-list"]').text()
    expect(list).toContain('Barbearia do Zé')
    expect(list).toContain('Barbeiro · vínculo exclusivo · vale até 28/11')

    await wrapper.get('button[aria-label="Aceitar convite de Barbearia do Zé"]').trigger('click')
    await waitUntil(() => router.currentRoute.value.name === 'barbershop')
    await waitUntil(() => wrapper.text().includes('Barbeiro'))

    expect(accepted).toEqual([pendingInvitation.id])
    expect(router.currentRoute.value.params.barbershopId).toBe(shopId)
  })

  it('sem convites pendentes, a página inicial não mostra o bloco', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(ze)),
      http.get('*/api/invitations', () => HttpResponse.json({ invitations: [] })),
    )
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Olá, Zé Navalha'))

    expect(wrapper.text()).not.toContain('Convites')
  })

  it('visitante não consulta convites', async () => {
    let asked = false
    server.use(
      http.get('*/api/me', () => HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })),
      http.get('*/api/invitations', () => {
        asked = true
        return HttpResponse.json({ invitations: [] })
      }),
    )
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Criar conta'))

    expect(asked).toBe(false)
  })
})
