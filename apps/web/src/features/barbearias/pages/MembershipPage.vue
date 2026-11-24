<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { ApiError } from '@/lib/http'
import { formatCep } from '@/lib/masks'
import { summarizeWindows } from '@/lib/weekly-windows'
import { useOwnMembership } from '../queries'

/** Página do vínculo, só leitura para o barbeiro (ADR-0022). */
const route = useRoute()
const membershipId = computed(() => String(route.params.membershipId))
const { data: membership, isPending, isError, error, refetch } = useOwnMembership(membershipId)

const notFound = computed(() => error.value instanceof ApiError && error.value.status === 404)

const hiredFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const facts = computed(() => {
  const m = membership.value
  if (!m) return []
  return [
    { label: 'Contratado em', value: hiredFormat.format(new Date(m.hiredAt)) },
    { label: 'Aprovado por', value: m.approvedBy.name },
    { label: 'Exclusividade', value: m.isExclusive ? 'Exclusivo desta barbearia' : 'Não exclusivo' },
    { label: 'Agendamentos', value: m.acceptsAppointments ? 'Aceitando' : 'Pausados pelo gerente' },
    { label: 'Situação', value: m.isActive ? 'Ativo' : 'Inativo' },
  ]
})

const shiftLines = computed(() => summarizeWindows(membership.value?.shift ?? []))
</script>

<template>
  <AppShell>
    <div
      v-if="isPending"
      class="h-40 animate-pulse rounded-xl bg-muted"
      aria-label="Carregando o vínculo"
    />

    <section
      v-else-if="isError"
      class="flex flex-col gap-3 rounded-xl border bg-card p-5"
    >
      <template v-if="notFound">
        <p>Vínculo não encontrado.</p>
        <RouterLink
          :to="{ name: 'home' }"
          class="font-semibold underline underline-offset-4"
        >
          Voltar para o início
        </RouterLink>
      </template>
      <template v-else>
        <p>Não foi possível carregar o vínculo.</p>
        <button
          type="button"
          class="h-11 self-start rounded-md border px-4 font-semibold"
          @click="refetch()"
        >
          Tentar de novo
        </button>
      </template>
    </section>

    <template v-else-if="membership">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-muted-foreground">
          Seu vínculo de barbeiro
        </p>
        <h1 class="font-display text-[2rem] font-extrabold leading-tight tracking-[-0.02em]">
          {{ membership.barbershop.name }}
        </h1>
        <address class="flex flex-col gap-0.5 not-italic text-muted-foreground">
          <span>
            {{ membership.barbershop.street }}, {{ membership.barbershop.number
            }}<template v-if="membership.barbershop.complement"> · {{ membership.barbershop.complement }}</template>
          </span>
          <span>
            {{ membership.barbershop.neighborhood }} · {{ membership.barbershop.city }}/{{ membership.barbershop.state }}
            · CEP {{ formatCep(membership.barbershop.cep) }}
          </span>
        </address>
      </div>

      <section
        class="rounded-xl border bg-card p-5"
        aria-label="Dados do vínculo"
      >
        <dl
          class="grid gap-4 sm:grid-cols-2"
          data-testid="membership-facts"
        >
          <div
            v-for="fact in facts"
            :key="fact.label"
            class="flex flex-col gap-0.5"
          >
            <dt class="text-sm text-muted-foreground">
              {{ fact.label }}
            </dt>
            <dd class="font-semibold">
              {{ fact.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section
        class="flex flex-col gap-2 rounded-xl border bg-card p-5"
        aria-labelledby="shift-title"
      >
        <h2
          id="shift-title"
          class="font-display text-xl font-extrabold"
        >
          Turno permitido
        </h2>
        <ul
          v-if="shiftLines.length"
          class="flex flex-col gap-1 tabular-nums"
          data-testid="membership-shift"
        >
          <li
            v-for="line in shiftLines"
            :key="line"
          >
            {{ line }}
          </li>
        </ul>
        <p
          v-else
          class="text-muted-foreground"
        >
          Sem turno definido: você abre sua agenda nesta barbearia como quiser.
        </p>
      </section>
    </template>
  </AppShell>
</template>
