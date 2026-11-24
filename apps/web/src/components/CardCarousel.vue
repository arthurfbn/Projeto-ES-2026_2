<script setup lang="ts">
import { useId } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type CarouselCard = { id: string; title: string; detail: string; to: RouteLocationRaw }

/**
 * Seção do Início com cartões em rolagem horizontal (ADR-0022). Cada cartão é um link: Tab
 * percorre os cartões, Enter abre. Sem cartões, a seção não aparece.
 */
defineProps<{ title: string; cards: CarouselCard[] }>()
const titleId = useId()
</script>

<template>
  <section
    v-if="cards.length"
    class="flex flex-col gap-3"
    :aria-labelledby="titleId"
  >
    <h2
      :id="titleId"
      class="font-display text-2xl font-extrabold"
    >
      {{ title }}
    </h2>
    <ul
      class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      :aria-label="title"
    >
      <li
        v-for="card in cards"
        :key="card.id"
        class="w-60 shrink-0 snap-start"
      >
        <RouterLink
          :to="card.to"
          class="flex h-full min-h-28 flex-col justify-between gap-3 rounded-xl border bg-card p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span class="font-display text-lg font-extrabold leading-tight">{{ card.title }}</span>
          <span class="flex items-center justify-between text-sm text-muted-foreground">
            {{ card.detail }}
            <span aria-hidden="true">›</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
