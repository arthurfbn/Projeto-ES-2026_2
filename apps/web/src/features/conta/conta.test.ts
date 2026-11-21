import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ApiErrorBody, MeResponse } from '@shavey/contracts'
import { renderRoute, settle, waitUntil } from '@/test/render'

// A início também mostra o status do sistema.
const server = setupServer(
  http.get('*/api/health', () => HttpResponse.json({ status: 'ok', database: 'up', version: 'test' })),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

const ana: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Ana Souza', email: 'ana@exemplo.com', phone: '11987654321' },
}

function visitor() {
  server.use(http.get('*/api/me', () => HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })))
}

function loggedIn() {
  server.use(http.get('*/api/me', () => HttpResponse.json(ana)))
}

async function fill(wrapper: Awaited<ReturnType<typeof renderRoute>>['wrapper'], values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    const field = wrapper.findAll('label').find((l) => l.text() === label)
    if (!field) throw new Error(`campo ${label} não encontrado`)
    await wrapper.get(`#${field.attributes('for')}`).setValue(value)
  }
}

const validSignup = { Nome: 'Ana Souza', 'E-mail': 'ana@exemplo.com', Telefone: '(11) 98765-4321', Senha: 'segredo123' }

describe('cadastro', () => {
  it('mostra o slogan da marca', async () => {
    visitor()
    const { wrapper } = await renderRoute('/cadastro')
    expect(wrapper.text()).toContain('Passa a máquina na fila.')
  })

  it('aponta telefone sem DDD no campo, sem chamar a API', async () => {
    visitor()
    let called = false
    server.use(http.post('*/api/auth/signup', () => ((called = true), HttpResponse.json(ana, { status: 201 }))))
    const { wrapper } = await renderRoute('/cadastro')

    await fill(wrapper, { ...validSignup, Telefone: '98765-4321' })
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('Informe o telefone com DDD')
    expect(called).toBe(false)
  })

  it('CA2: avisa "E-mail já cadastrado." no campo de e-mail', async () => {
    visitor()
    const conflict: ApiErrorBody = {
      error: 'EMAIL_TAKEN',
      message: 'E-mail já cadastrado.',
      fields: { email: 'E-mail já cadastrado.' },
    }
    server.use(http.post('*/api/auth/signup', () => HttpResponse.json(conflict, { status: 409 })))
    const { wrapper } = await renderRoute('/cadastro')

    await fill(wrapper, validSignup)
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('E-mail já cadastrado.')
  })

  it('CA1: depois de cadastrar, entra logado e vê a visão de cliente', async () => {
    visitor()
    server.use(http.post('*/api/auth/signup', () => HttpResponse.json(ana, { status: 201 })))
    const { wrapper, router } = await renderRoute('/cadastro')

    await fill(wrapper, validSignup)
    await wrapper.get('form').trigger('submit')
    await waitUntil(() => wrapper.text().includes('Olá, Ana Souza'))

    expect(router.currentRoute.value.name).toBe('home')
    expect(wrapper.text()).toContain('Olá, Ana Souza')
    expect(wrapper.text()).toContain('Visão: Cliente')
  })
})

describe('entrar e sair', () => {
  it('CA3: senha errada mostra a mensagem genérica', async () => {
    visitor()
    const invalid: ApiErrorBody = { error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' }
    server.use(http.post('*/api/auth/login', () => HttpResponse.json(invalid, { status: 401 })))
    const { wrapper } = await renderRoute('/entrar')

    await fill(wrapper, { 'E-mail': 'ana@exemplo.com', Senha: 'errada123' })
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(wrapper.get('[role="alert"]').text()).toBe('E-mail ou senha inválidos.')
  })

  it('CA3: ao sair, volta a ver as opções de visitante', async () => {
    loggedIn()
    let loggedOut = false
    server.use(http.post('*/api/auth/logout', () => ((loggedOut = true), new HttpResponse(null, { status: 204 }))))
    const { wrapper } = await renderRoute('/')
    await waitUntil(() => wrapper.text().includes('Olá, Ana Souza'))

    const sair = wrapper.findAll('button').find((b) => b.text() === 'Sair')
    await sair?.trigger('click')
    await waitUntil(() => wrapper.text().includes('Criar conta'))

    expect(loggedOut).toBe(true)
    expect(wrapper.text()).not.toContain('Olá, Ana Souza')
  })

  it('quem já está logado e abre /cadastro volta para a início', async () => {
    loggedIn()
    const { router } = await renderRoute('/cadastro')
    expect(router.currentRoute.value.name).toBe('home')
  })
})
