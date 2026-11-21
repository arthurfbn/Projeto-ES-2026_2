import { vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import App from '@/App.vue'

/** Monta o app inteiro (router + TanStack Query) numa rota, como o usuário veria. */
export async function renderRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    global: { plugins: [router, [VueQueryPlugin, { queryClient }]] },
    attachTo: document.body,
  })
  await settle()
  return { wrapper, router, queryClient }
}

export async function settle() {
  for (let i = 0; i < 6; i++) await flushPromises()
}

/** Espera algo aparecer (navegação com página carregada sob demanda, respostas da API). */
export async function waitUntil(check: () => boolean, timeout = 2000) {
  await vi.waitFor(
    async () => {
      await flushPromises()
      if (!check()) throw new Error('ainda não')
    },
    { timeout, interval: 10 },
  )
}
