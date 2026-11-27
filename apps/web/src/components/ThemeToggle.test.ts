import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoute } from '@/test/render'
import { THEME_STORAGE_KEY } from '@/stores/theme'

const server = setupServer(
  http.get('*/api/health', () => HttpResponse.json({ status: 'ok', database: 'up', version: 'test' })),
  http.get('*/api/me', () => HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

describe('tema claro e escuro', () => {
  it('alterna o tema da página, troca o símbolo pelo negativo e lembra a escolha', async () => {
    const { wrapper } = await renderRoute('/entrar')
    const logo = () => wrapper.get('[data-testid="brand-logo"]').attributes('src')
    expect(logo()).toBe('/logo.svg')

    await wrapper.get('button[aria-label="Usar tema escuro"]').trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(logo()).toBe('/logo-negativo.svg')
    expect(wrapper.find('[data-testid="icon-sun"]').exists()).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await wrapper.get('button[aria-label="Usar tema claro"]').trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(logo()).toBe('/logo.svg')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})
