<script setup lang="ts">
import { ref } from 'vue'
import type { CreateServiceRequest, Service } from '@shavey/contracts'
import { formatCents } from '@/lib/money'
import { useCreateService, useServices, useUpdateService } from '../queries'
import ServiceForm from './ServiceForm.vue'

const props = defineProps<{ barbershopId: string }>()

const { data: services, isPending, isError, refetch } = useServices(() => props.barbershopId)
const create = useCreateService(() => props.barbershopId)
const update = useUpdateService(() => props.barbershopId)

const editingId = ref<string | null>(null)
const toggleError = ref<string | null>(null)

async function saveEdit(service: Service, request: CreateServiceRequest) {
  await update.mutateAsync({ serviceId: service.id, patch: request })
  editingId.value = null
}

async function toggleActive(service: Service) {
  toggleError.value = null
  try {
    await update.mutateAsync({ serviceId: service.id, patch: { isActive: !service.isActive } })
  } catch {
    toggleError.value = `Não foi possível ${service.isActive ? 'desativar' : 'reativar'} "${service.name}". Tente de novo.`
  }
}
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-xl border bg-card p-5"
    aria-labelledby="services-title"
  >
    <h2
      id="services-title"
      class="font-display text-2xl font-extrabold"
    >
      Serviços
    </h2>

    <div
      v-if="isPending"
      class="h-24 animate-pulse rounded-md bg-muted"
      aria-label="Carregando serviços"
    />

    <div
      v-else-if="isError"
      class="flex flex-col gap-3"
    >
      <p>Não foi possível carregar os serviços.</p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="refetch()"
      >
        Tentar de novo
      </button>
    </div>

    <template v-else>
      <p
        v-if="!services?.length"
        class="text-muted-foreground"
      >
        Nenhum serviço cadastrado ainda.
      </p>
      <ul
        v-else
        class="flex flex-col divide-y divide-border"
        data-testid="service-list"
      >
        <li
          v-for="service in services"
          :key="service.id"
          class="flex flex-col gap-3 py-3"
        >
          <ServiceForm
            v-if="editingId === service.id"
            :label="`Editar ${service.name}`"
            submit-label="Salvar"
            pending-label="Salvando…"
            :initial="service"
            :save="(request) => saveEdit(service, request)"
            @cancel="editingId = null"
          />
          <template v-else>
            <div class="flex items-start justify-between gap-3">
              <div
                class="flex flex-col"
                :class="{ 'text-muted-foreground': !service.isActive }"
              >
                <span class="font-semibold">
                  {{ service.name }}
                  <span
                    v-if="!service.isActive"
                    class="ml-1 rounded-full border border-input px-2 py-0.5 text-xs font-semibold"
                  >Inativo</span>
                </span>
                <span class="text-sm tabular-nums">
                  {{ formatCents(service.priceCents) }} · {{ service.durationMinutes }} min
                </span>
              </div>
              <div class="flex shrink-0 gap-2">
                <button
                  type="button"
                  class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
                  @click="editingId = service.id"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                  :disabled="update.isPending.value"
                  @click="toggleActive(service)"
                >
                  {{ service.isActive ? 'Desativar' : 'Reativar' }}
                </button>
              </div>
            </div>
          </template>
        </li>
      </ul>
      <p
        v-if="toggleError"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ toggleError }}
      </p>
    </template>

    <div class="flex flex-col gap-3 border-t pt-4">
      <h3 class="font-semibold">
        Novo serviço
      </h3>
      <ServiceForm
        label="Novo serviço"
        submit-label="Adicionar serviço"
        pending-label="Adicionando…"
        :save="(request) => create.mutateAsync(request)"
      />
    </div>
  </section>
</template>
