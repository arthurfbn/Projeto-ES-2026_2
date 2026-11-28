<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '@/components/AppShell.vue'
import CardCarousel, { type CarouselCard } from '@/components/CardCarousel.vue'
import BarbershopSearch from '@/features/barbearias/components/BarbershopSearch.vue'
import ReceivedInvitations from '@/features/barbearias/components/ReceivedInvitations.vue'
import { useMe } from '@/features/conta/queries'
import HealthStatus from '@/features/sistema/HealthStatus.vue'

/**
 * Início (ADR-0022): o mesmo feed para todo mundo, sem troca de visão. Mostra a busca com os
 * serviços da plataforma e o que existe para a pessoa: convites, barbearias que ela gerencia e
 * seus vínculos de barbeiro.
 */
const { data: me, isPending, isError, refetch } = useMe()

const managed = computed<CarouselCard[]>(() =>
  (me.value?.managedBarbershops ?? []).map((shop) => ({
    id: shop.id,
    title: shop.name,
    detail: 'Gestão da barbearia',
    to: { name: 'barbershop', params: { barbershopId: shop.id } },
  })),
)

const memberships = computed<CarouselCard[]>(() =>
  (me.value?.memberships ?? []).map((membership) => ({
    id: membership.id,
    title: membership.barbershopName,
    detail: 'Seu vínculo de barbeiro',
    to: { name: 'membership', params: { membershipId: membership.id } },
  })),
)
</script>

<template>
  <AppShell>
    <div
      v-if="isPending"
      class="h-40 animate-pulse rounded-xl bg-muted"
      aria-label="Carregando o início"
    />

    <section
      v-else-if="isError"
      class="flex flex-col gap-3 rounded-xl border bg-card p-5"
    >
      <p>Não foi possível carregar sua conta.</p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="refetch()"
      >
        Tentar de novo
      </button>
    </section>

    <template v-else-if="me">
      <h1 class="font-display text-[2rem] font-extrabold leading-tight tracking-[-0.02em]">
        Olá, {{ me.user.name }}
      </h1>
      <BarbershopSearch />
      <ReceivedInvitations />
      <CardCarousel
        title="Minhas barbearias"
        :cards="managed"
      />
      <CardCarousel
        title="Meus vínculos"
        :cards="memberships"
      />
    </template>

    <template v-else>
      <p class="font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[2.625rem]">
        Passa a máquina na fila.
      </p>
      <section class="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row">
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
      </section>
      <HealthStatus />
    </template>
  </AppShell>
</template>
