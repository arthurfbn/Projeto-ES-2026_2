<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLogout, useMe } from '@/features/conta/queries'
import AppHeader from './AppHeader.vue'
import BrandMark from './BrandMark.vue'
import NavIcon from './NavIcon.vue'
import ThemeToggle from './ThemeToggle.vue'

/**
 * Casca do app (ADR-0022). Quem entrou vê a navbar: lateral no desktop, barra de abas no rodapé
 * no celular (< 768 px). Visitante vê só o cabeçalho com a marca. Sem seletor de visão.
 */
const { data: me } = useMe()
const logout = useLogout()
const router = useRouter()

const links = [
  { to: { name: 'home' }, label: 'Início', icon: 'home' },
  { to: { name: 'create-barbershop' }, label: 'Criar barbearia', icon: 'create' },
] as const

async function signOut() {
  await logout.mutateAsync()
  await router.push({ name: 'home' })
}

const itemClass =
  'flex items-center gap-3 rounded-md px-3 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60'
const activeClass = 'bg-accent text-accent-foreground'
</script>

<template>
  <div
    v-if="me"
    class="min-h-dvh md:flex"
  >
    <aside class="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r bg-card px-4 py-6 md:flex">
      <BrandMark />
      <nav
        aria-label="Principal"
        class="flex flex-col gap-1"
      >
        <RouterLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          :class="[itemClass, 'h-11']"
          :exact-active-class="activeClass"
        >
          <NavIcon :name="link.icon" />
          {{ link.label }}
        </RouterLink>
        <button
          type="button"
          :class="[itemClass, 'h-11 text-left']"
          :disabled="logout.isPending.value"
          @click="signOut"
        >
          <NavIcon name="logout" />
          Sair
        </button>
      </nav>
      <div class="mt-auto">
        <ThemeToggle />
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center justify-between gap-4 px-4 py-4 md:hidden">
        <BrandMark />
        <ThemeToggle />
      </header>
      <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-2 md:px-8 md:py-10">
        <slot />
      </main>
    </div>

    <nav
      aria-label="Principal"
      class="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <RouterLink
        v-for="link in links"
        :key="link.label"
        :to="link.to"
        class="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        exact-active-class="text-foreground [&>svg]:text-accent"
      >
        <NavIcon :name="link.icon" />
        {{ link.label }}
      </RouterLink>
      <button
        type="button"
        class="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        :disabled="logout.isPending.value"
        @click="signOut"
      >
        <NavIcon name="logout" />
        Sair
      </button>
    </nav>
  </div>

  <div
    v-else
    class="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-6 sm:py-10"
  >
    <AppHeader />
    <main class="flex flex-col gap-6">
      <slot />
    </main>
  </div>
</template>
