<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { ApiError } from '@/lib/http'
import { formatCep } from '@/lib/masks'
import InviteSection from '../components/InviteSection.vue'
import ServicesSection from '../components/ServicesSection.vue'
import TeamSection from '../components/TeamSection.vue'
import { useBarbershop } from '../queries'

const route = useRoute()
const barbershopId = computed(() => String(route.params.barbershopId))
const { data, isPending, isError, error, refetch } = useBarbershop(barbershopId)

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

      <section
        v-else-if="data"
        class="flex flex-col gap-4 rounded-xl border bg-card p-5"
      >
        <ul
          class="flex flex-wrap gap-2"
          aria-label="Seus perfis nesta barbearia"
        >
          <li
            v-if="data.roles.manager"
            class="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground"
          >
            Gerente
          </li>
          <li
            v-if="data.roles.barber"
            class="rounded-full border border-input px-3 py-1 text-sm font-semibold"
          >
            Barbeiro
          </li>
        </ul>
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

      <template v-if="data?.roles.manager">
        <ServicesSection :barbershop-id="barbershopId" />
        <TeamSection :barbershop-id="barbershopId" />
        <InviteSection :barbershop-id="barbershopId" />
      </template>
    </div>
  </AppShell>
</template>
