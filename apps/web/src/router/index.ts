import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import type { QueryClient } from '@tanstack/vue-query'
import { fetchMeCached } from '@/features/conta/queries'

declare module 'vue-router' {
  interface RouteMeta {
    /** Só para visitantes: quem já está logado volta para a início. */
    guestOnly?: boolean
    /** Só para quem entrou na conta: visitante vai para o login. */
    requiresAuth?: boolean
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
      {
        path: '/barbearias/nova',
        name: 'create-barbershop',
        component: () => import('@/features/barbearias/pages/CreateBarbershopPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/barbearias/:barbershopId',
        name: 'barbershop',
        component: () => import('@/features/barbearias/pages/BarbershopPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/vinculos/:membershipId',
        name: 'membership',
        component: () => import('@/features/barbearias/pages/MembershipPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  })

  router.beforeEach(async (to) => {
    if (!to.meta.guestOnly && !to.meta.requiresAuth) return true
    // A autoridade é a API; aqui só escolhemos a tela certa para quem entrou ou não.
    const me = await fetchMeCached(queryClient).catch(() => null)
    if (to.meta.guestOnly) return me ? { name: 'home' } : true
    return me ? true : { name: 'login' }
  })

  return router
}
