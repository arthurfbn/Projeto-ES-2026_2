<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { ApiError } from '@/lib/http'
import { formatCep } from '@/lib/masks'
import { formatCents } from '@/lib/money'
import BookingPanel from '../components/BookingPanel.vue'
import { useBarbershopPage } from '../queries'

/**
 * Página da barbearia (spec 003, R3): o que o cliente vê para escolher onde agendar. Diferente da
 * Gestão da barbearia, que é do gerente.
 */
const route = useRoute()
const barbershopId = computed(() => String(route.params.barbershopId))
const { data, isPending, isError, error, refetch } = useBarbershopPage(barbershopId)

/** Serviço com o painel de agendar aberto (um por vez). */
const bookingServiceId = ref<string | null>(null)

const notFound = computed(() => error.value instanceof ApiError && error.value.status === 404)
</script>

<template>
  <AppShell>
    <div
      class="flex flex-col gap-6"
      aria-live="polite"
    >
      <div
        v-if="isPending"
        class="h-40 animate-pulse rounded-xl bg-muted"
        aria-label="Carregando a barbearia"
      />

      <section
        v-else-if="isError"
        class="flex flex-col gap-3 rounded-xl border bg-card p-5"
      >
        <template v-if="notFound">
          <p>Barbearia não encontrada.</p>
          <RouterLink
            :to="{ name: 'home' }"
            class="font-semibold underline underline-offset-4"
          >
            Voltar para o início
          </RouterLink>
        </template>
        <template v-else>
          <p>Não foi possível carregar a barbearia.</p>
          <button
            type="button"
            class="h-11 self-start rounded-md border px-4 font-semibold"
            @click="refetch()"
          >
            Tentar de novo
          </button>
        </template>
      </section>

      <template v-else-if="data">
        <section class="flex flex-col gap-2 rounded-xl border bg-card p-5">
          <h1 class="font-display text-[2rem] font-extrabold leading-tight tracking-[-0.02em]">
            {{ data.barbershop.name }}
          </h1>
          <address class="flex flex-col gap-0.5 not-italic text-muted-foreground">
            <span>
              {{ data.barbershop.street }}, {{ data.barbershop.number
              }}<template v-if="data.barbershop.complement"> · {{ data.barbershop.complement }}</template>
            </span>
            <span>{{ data.barbershop.neighborhood }} · {{ data.barbershop.city }}/{{ data.barbershop.state }}</span>
            <span>CEP {{ formatCep(data.barbershop.cep) }}</span>
          </address>
        </section>

        <section
          class="flex flex-col gap-3"
          aria-labelledby="servicos-da-barbearia"
        >
          <h2
            id="servicos-da-barbearia"
            class="font-display text-2xl font-extrabold"
          >
            Serviços
          </h2>
          <p
            v-if="!data.services.length"
            class="rounded-xl border bg-card p-4 text-muted-foreground"
          >
            Esta barbearia ainda não tem serviços para agendar.
          </p>
          <article
            v-for="service in data.services"
            :key="service.id"
            class="flex flex-col gap-3 rounded-xl border bg-card p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-display text-lg font-extrabold">
                {{ service.name }}
              </h3>
              <button
                v-if="bookingServiceId !== service.id"
                type="button"
                class="h-10 rounded-md bg-primary px-4 font-display font-extrabold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                @click="bookingServiceId = service.id"
              >
                Agendar
              </button>
            </div>
            <BookingPanel
              v-if="bookingServiceId === service.id"
              :barbershop-id="barbershopId"
              :service="service"
              @close="bookingServiceId = null"
            />
            <ul
              class="flex flex-col divide-y"
              :aria-label="`Barbeiros que fazem ${service.name}`"
            >
              <li
                v-for="barber in service.barbers"
                :key="barber.membershipId"
                class="flex items-center justify-between gap-3 py-2"
              >
                <span class="font-semibold">{{ barber.name }}</span>
                <span class="text-right tabular-nums">
                  {{ formatCents(barber.priceCents) }}
                  <span class="text-sm text-muted-foreground">· {{ barber.durationMinutes }} min</span>
                </span>
              </li>
            </ul>
          </article>
        </section>
      </template>
    </div>
  </AppShell>
</template>
