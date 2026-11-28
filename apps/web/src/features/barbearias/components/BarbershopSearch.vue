<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useBarbershopSearch, usePlatformServices } from '../queries'

/**
 * Busca e serviços da plataforma no topo do Início (spec 003, R1–R2; ADR-0022). A busca vai à
 * API ao enviar (Enter ou botão); tocar num chip lista quem oferece o serviço, e tocar de novo
 * desmarca.
 */
const inputId = useId()
const typed = ref('')
const submitted = ref('')
const serviceKey = ref<string | null>(null)

const query = computed(() => ({
  ...(submitted.value ? { q: submitted.value } : {}),
  ...(serviceKey.value ? { service: serviceKey.value } : {}),
}))
const hasQuery = computed(() => Boolean(query.value.q || query.value.service))

const { data: services } = usePlatformServices()
const { data: results, isFetching, isError, refetch } = useBarbershopSearch(query)

function submit() {
  submitted.value = typed.value.trim()
}

function toggleService(key: string) {
  serviceKey.value = serviceKey.value === key ? null : key
}
</script>

<template>
  <section
    class="flex flex-col gap-3"
    aria-label="Buscar barbearias"
  >
    <form
      role="search"
      class="flex gap-2"
      @submit.prevent="submit"
    >
      <label
        :for="inputId"
        class="sr-only"
      >Barbearia, bairro ou cidade</label>
      <input
        :id="inputId"
        v-model="typed"
        type="search"
        placeholder="Barbearia, bairro ou cidade"
        autocomplete="off"
        class="h-12 min-w-0 flex-1 rounded-md border border-input bg-card px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
      <button
        type="submit"
        class="h-12 rounded-md bg-primary px-5 font-display font-extrabold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Buscar
      </button>
    </form>

    <ul
      v-if="services?.length"
      class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      aria-label="Serviços"
    >
      <li
        v-for="service in services"
        :key="service.key"
        class="shrink-0"
      >
        <button
          type="button"
          :aria-pressed="serviceKey === service.key"
          class="h-10 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :class="serviceKey === service.key ? 'border-accent bg-accent text-accent-foreground' : 'bg-card'"
          @click="toggleService(service.key)"
        >
          {{ service.name }}
        </button>
      </li>
    </ul>

    <div
      v-if="hasQuery"
      aria-live="polite"
    >
      <div
        v-if="isFetching && !results"
        class="h-20 animate-pulse rounded-xl bg-muted"
        aria-label="Buscando barbearias"
      />
      <div
        v-else-if="isError"
        class="flex flex-col gap-3 rounded-xl border bg-card p-4"
      >
        <p>Não foi possível buscar agora.</p>
        <button
          type="button"
          class="h-11 self-start rounded-md border px-4 font-semibold"
          @click="refetch()"
        >
          Tentar de novo
        </button>
      </div>
      <p
        v-else-if="results && !results.length"
        class="rounded-xl border bg-card p-4 text-muted-foreground"
      >
        Nenhuma barbearia encontrada.
      </p>
      <ul
        v-else-if="results"
        class="flex flex-col gap-2"
        aria-label="Barbearias encontradas"
      >
        <li
          v-for="shop in results"
          :key="shop.id"
        >
          <RouterLink
            :to="{ name: 'barbershop-page', params: { barbershopId: shop.id } }"
            class="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span class="flex flex-col">
              <span class="font-display text-lg font-extrabold leading-tight">{{ shop.name }}</span>
              <span class="text-sm text-muted-foreground">{{ shop.neighborhood }} · {{ shop.city }}/{{ shop.state }}</span>
            </span>
            <span aria-hidden="true">›</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>
