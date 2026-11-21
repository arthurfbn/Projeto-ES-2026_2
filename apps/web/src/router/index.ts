import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import type { QueryClient } from '@tanstack/vue-query'
import { fetchMeCached } from '@/features/conta/queries'

declare module 'vue-router' {
  interface RouteMeta {
    /** Só para visitantes: quem já está logado volta para a início. */
    guestOnly?: boolean
  }
}

export function createAppRouter(queryClient: QueryClient, history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },
      {
        path: '/cadastro',
        name: 'signup',
        component: () => import('@/features/conta/pages/SignupPage.vue'),
        meta: { guestOnly: true },
      },
      {
        path: '/entrar',
        name: 'login',
        component: () => import('@/features/conta/pages/LoginPage.vue'),
        meta: { guestOnly: true },
      },
    ],
  })

  router.beforeEach(async (to) => {
    if (!to.meta.guestOnly) return true
    // A autoridade é a API; aqui só evitamos mostrar o cadastro para quem já entrou.
    const me = await fetchMeCached(queryClient).catch(() => null)
    return me ? { name: 'home' } : true
  })

  return router
}
