<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BarberService, SetBarberServiceRequest } from '@shavey/contracts'
import { formatCents } from '@/lib/money'
import { useBarberServices, useRemoveBarberService, useServices, useSetBarberService } from '../queries'
import BarberServiceForm from './BarberServiceForm.vue'

const props = defineProps<{ barbershopId: string; membershipId: string; barberName: string }>()

const { data: assigned, isPending, isError, refetch } = useBarberServices(
  () => props.barbershopId,
  () => props.membershipId,
)
const { data: shopServices } = useServices(() => props.barbershopId)
const setService = useSetBarberService(() => props.barbershopId, () => props.membershipId)
const removeService = useRemoveBarberService(() => props.barbershopId, () => props.membershipId)

const editingId = ref<string | null>(null)
const removeError = ref<string | null>(null)

/** Só serviços ativos que o barbeiro ainda não realiza (desativado não é atribuído). */
const available = computed(() => {
  const taken = new Set((assigned.value ?? []).map((service) => service.serviceId))
  return (shopServices.value ?? []).filter((service) => service.isActive && !taken.has(service.id))
})

const save = (serviceId: string, input: SetBarberServiceRequest) => setService.mutateAsync({ serviceId, input })

async function saveEdit(serviceId: string, input: SetBarberServiceRequest) {
  await save(serviceId, input)
  editingId.value = null
}

async function remove(service: BarberService) {
  removeError.value = null
  try {
    await removeService.mutateAsync(service.serviceId)
  } catch {
    removeError.value = `Não foi possível remover "${service.name}". Tente de novo.`
  }
}

/** Padrão do serviço (para "vazio = padrão" na edição), vindo da lista de serviços da barbearia. */
function defaultsOf(service: BarberService) {
  const shopService = shopServices.value?.find((candidate) => candidate.id === service.serviceId)
  return {
    id: service.serviceId,
    name: service.name,
    priceCents: shopService?.priceCents ?? service.effectivePriceCents,
    durationMinutes: shopService?.durationMinutes ?? service.effectiveDurationMinutes,
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg border p-4"
    data-testid="barber-services"
  >
    <h3 class="font-semibold">
      Serviços de {{ barberName }}
    </h3>

    <div
      v-if="isPending"
      class="h-16 animate-pulse rounded-md bg-muted"
      aria-label="Carregando serviços do barbeiro"
    />
    <div
      v-else-if="isError"
      class="flex flex-col gap-2"
    >
      <p>Não foi possível carregar os serviços do barbeiro.</p>
      <button
        type="button"
        class="h-10 self-start rounded-md border px-3 text-sm font-semibold"
        @click="refetch()"
      >
        Tentar de novo
      </button>
    </div>
    <template v-else>
      <p
        v-if="!assigned?.length"
        class="text-sm text-muted-foreground"
      >
        Este barbeiro ainda não tem serviços.
      </p>
      <ul
        v-else
        class="flex flex-col divide-y divide-border"
      >
        <li
          v-for="service in assigned"
          :key="service.serviceId"
          class="flex flex-col gap-2 py-2"
        >
          <BarberServiceForm
            v-if="editingId === service.serviceId"
            :label="`Editar ${service.name} do barbeiro`"
            submit-label="Salvar"
            :service="defaultsOf(service)"
            :initial="{ priceCents: service.priceCents, durationMinutes: service.durationMinutes }"
            :save="saveEdit"
            @cancel="editingId = null"
          />
          <div
            v-else
            class="flex items-start justify-between gap-3"
          >
            <div
              class="flex flex-col"
              :class="{ 'text-muted-foreground': !service.serviceIsActive }"
            >
              <span class="font-semibold">
                {{ service.name }}
                <span
                  v-if="!service.serviceIsActive"
                  class="ml-1 rounded-full border border-input px-2 py-0.5 text-xs font-semibold"
                >Serviço inativo</span>
              </span>
              <span class="text-sm tabular-nums">
                {{ formatCents(service.effectivePriceCents) }} · {{ service.effectiveDurationMinutes }} min
                <template v-if="service.priceCents !== null || service.durationMinutes !== null"> (próprio)</template>
              </span>
            </div>
            <div class="flex shrink-0 gap-2">
              <button
                v-if="service.serviceIsActive"
                type="button"
                class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
                @click="editingId = service.serviceId"
              >
                Editar
              </button>
              <button
                type="button"
                class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                :disabled="removeService.isPending.value"
                @click="remove(service)"
              >
                Remover
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p
        v-if="removeError"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ removeError }}
      </p>

      <div
        v-if="available.length"
        class="flex flex-col gap-2 border-t pt-3"
      >
        <BarberServiceForm
          label="Adicionar serviço ao barbeiro"
          submit-label="Adicionar ao barbeiro"
          :options="available"
          :save="save"
        />
      </div>
      <p
        v-else-if="shopServices"
        class="text-sm text-muted-foreground"
      >
        Todos os serviços ativos da barbearia já estão com este barbeiro.
      </p>
    </template>
  </div>
</template>
