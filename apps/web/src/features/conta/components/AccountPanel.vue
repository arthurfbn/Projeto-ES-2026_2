<script setup lang="ts">
import { useMe, useLogout } from '../queries'

const { data: me, isPending, isError, refetch } = useMe()
const logout = useLogout()
</script>

<template>
  <section
    class="rounded-xl border bg-card p-5"
    aria-live="polite"
  >
    <div
      v-if="isPending"
      class="h-16 animate-pulse rounded-md bg-muted"
      aria-label="Carregando sua conta"
    />

    <div
      v-else-if="isError"
      class="flex flex-col gap-3"
    >
      <p>Não foi possível carregar sua conta.</p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="refetch()"
      >
        Tentar de novo
      </button>
    </div>

    <div
      v-else-if="me"
      class="flex flex-col gap-3"
    >
      <p class="text-sm text-muted-foreground">
        Visão: Cliente
      </p>
      <h2 class="text-2xl font-extrabold">
        Olá, {{ me.user.name }}
      </h2>
      <RouterLink
        :to="{ name: 'create-barbershop' }"
        class="flex h-13 items-center justify-center rounded-md bg-primary px-4 font-display text-lg font-extrabold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Criar barbearia
      </RouterLink>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold disabled:opacity-60"
        :disabled="logout.isPending.value"
        @click="logout.mutate()"
      >
        Sair
      </button>
    </div>

    <div
      v-else
      class="flex flex-col gap-3 sm:flex-row"
    >
      <RouterLink
        :to="{ name: 'signup' }"
        class="flex h-13 flex-1 items-center justify-center rounded-md bg-primary px-4 font-display text-lg font-extrabold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Criar conta
      </RouterLink>
      <RouterLink
        :to="{ name: 'login' }"
        class="flex h-13 flex-1 items-center justify-center rounded-md border border-input px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Entrar
      </RouterLink>
    </div>
  </section>
</template>
