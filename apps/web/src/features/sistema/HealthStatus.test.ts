import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { HealthResponse } from '@shavey/contracts'
import HealthStatus from './HealthStatus.vue'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function respondHealth(body: HealthResponse | null, status = 200) {
  server.use(http.get('*/api/health', () => HttpResponse.json(body, { status })))
}

function render() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return mount(HealthStatus, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

async function settle() {
  for (let i = 0; i < 5; i++) await flushPromises()
}

describe('HealthStatus', () => {
  it('mostra que servidor e banco estão no ar', async () => {
    respondHealth({ status: 'ok', database: 'up', version: 'abc1234' })
    const wrapper = render()
    await settle()

    expect(wrapper.get('[data-testid="health-label"]').text()).toBe('Máquina ligada: servidor e banco no ar.')
    expect(wrapper.text()).toContain('abc1234')
  })

  it('avisa quando o banco está fora mesmo com a API respondendo 503', async () => {
    respondHealth({ status: 'degraded', database: 'down', version: 'abc1234' }, 503)
    const wrapper = render()
    await settle()

    expect(wrapper.get('[data-testid="health-label"]').text()).toBe('Servidor no ar, banco de dados fora.')
  })

  it('oferece tentar de novo quando o servidor não responde', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(http.get('*/api/health', () => HttpResponse.error()))
    const wrapper = render()
    // A consulta tenta algumas vezes antes de desistir (API gratuita pode estar acordando).
    await vi.advanceTimersByTimeAsync(60_000)
    await settle()
    vi.useRealTimers()

    expect(wrapper.text()).toContain('Não foi possível falar com o servidor.')
    expect(wrapper.find('button').text()).toBe('Tentar de novo')
  })
})
