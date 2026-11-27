<script setup lang="ts">
import { ref } from 'vue'
import type { Membership, UpdateMembershipRequest, WeeklyWindow } from '@shavey/contracts'
import { formErrorsFrom } from '@/features/conta/form-errors'
import { summarizeWindows } from '@/lib/weekly-windows'
import { useMemberships, useUpdateMembership, useUpdateShift } from '../queries'
import BarberServicesPanel from './BarberServicesPanel.vue'
import ShiftEditor from './ShiftEditor.vue'

const props = defineProps<{ barbershopId: string }>()

const { data: memberships, isPending, isError, refetch } = useMemberships(() => props.barbershopId)
const updateShift = useUpdateShift(() => props.barbershopId)
const updateMembership = useUpdateMembership(() => props.barbershopId)

const editingId = ref<string | null>(null)
/** Vínculo com o painel de serviços do barbeiro aberto (R16). */
const servicesOpenId = ref<string | null>(null)
const actionError = ref<{ membershipId: string; message: string } | null>(null)

const hiredFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' })

async function saveShift(membership: Membership, windows: WeeklyWindow[]) {
  await updateShift.mutateAsync({ membershipId: membership.id, windows })
  editingId.value = null
}

async function run(membership: Membership, action: () => Promise<unknown>) {
  actionError.value = null
  try {
    await action()
  } catch (failure) {
    const { general, fields } = formErrorsFrom(failure)
    actionError.value = { membershipId: membership.id, message: general ?? fields.windows ?? 'Não deu certo. Tente de novo.' }
  }
}

const removeShift = (membership: Membership) =>
  run(membership, () => updateShift.mutateAsync({ membershipId: membership.id, windows: [] }))

const patch = (membership: Membership, change: UpdateMembershipRequest) =>
  run(membership, () => updateMembership.mutateAsync({ membershipId: membership.id, patch: change }))

const busy = () => updateShift.isPending.value || updateMembership.isPending.value
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-xl border bg-card p-5"
    aria-labelledby="team-title"
  >
    <h2
      id="team-title"
      class="font-display text-2xl font-extrabold"
    >
      Equipe
    </h2>

    <div
      v-if="isPending"
      class="h-24 animate-pulse rounded-md bg-muted"
      aria-label="Carregando a equipe"
    />

    <div
      v-else-if="isError"
      class="flex flex-col gap-3"
    >
      <p>Não foi possível carregar a equipe.</p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="refetch()"
      >
        Tentar de novo
      </button>
    </div>

    <p
      v-else-if="!memberships?.length"
      class="text-muted-foreground"
    >
      Nenhum barbeiro vinculado ainda.
    </p>

    <ul
      v-else
      class="flex flex-col divide-y divide-border"
      data-testid="team"
    >
      <li
        v-for="membership in memberships"
        :key="membership.id"
        class="flex flex-col gap-3 py-3"
      >
        <div class="flex flex-col gap-1">
          <span class="font-semibold">{{ membership.barber.name }}</span>
          <span class="text-sm text-muted-foreground">
            Contratado em {{ hiredFormat.format(new Date(membership.hiredAt)) }}
          </span>
          <ul
            class="flex flex-wrap gap-2 text-xs font-semibold"
            aria-label="Situação do vínculo"
          >
            <li
              v-if="!membership.isActive"
              class="rounded-full border border-input px-2 py-0.5"
            >
              Inativo
            </li>
            <li
              v-if="!membership.acceptsAppointments"
              class="rounded-full border border-input px-2 py-0.5"
            >
              Não aceita agendamentos
            </li>
            <li
              v-if="membership.isExclusive"
              class="rounded-full border border-input px-2 py-0.5"
            >
              Exclusivo
            </li>
          </ul>
          <p class="text-sm">
            <span class="font-semibold">Turno: </span>
            <template v-if="membership.shift.length">
              {{ summarizeWindows(membership.shift).join(' · ') }}
            </template>
            <template v-else>
              Sem turno
            </template>
          </p>
        </div>

        <ShiftEditor
          v-if="editingId === membership.id"
          :barber-name="membership.barber.name"
          :initial="membership.shift"
          :save="(windows) => saveShift(membership, windows)"
          @cancel="editingId = null"
        />
        <div
          v-else
          class="flex flex-wrap gap-2"
        >
          <button
            type="button"
            class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
            @click="editingId = membership.id"
          >
            {{ membership.shift.length ? 'Editar turno' : 'Definir turno' }}
          </button>
          <button
            v-if="membership.shift.length"
            type="button"
            class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            :disabled="busy()"
            @click="removeShift(membership)"
          >
            Remover turno
          </button>
          <button
            type="button"
            class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            :disabled="busy()"
            @click="patch(membership, { acceptsAppointments: !membership.acceptsAppointments })"
          >
            {{ membership.acceptsAppointments ? 'Pausar agendamentos' : 'Retomar agendamentos' }}
          </button>
          <button
            type="button"
            class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            :disabled="busy()"
            @click="patch(membership, { isActive: !membership.isActive })"
          >
            {{ membership.isActive ? 'Desativar vínculo' : 'Reativar vínculo' }}
          </button>
          <button
            type="button"
            class="h-9 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
            :aria-expanded="servicesOpenId === membership.id"
            @click="servicesOpenId = servicesOpenId === membership.id ? null : membership.id"
          >
            Serviços do barbeiro
          </button>
        </div>
        <p
          v-if="actionError?.membershipId === membership.id"
          role="alert"
          class="text-sm text-destructive"
        >
          {{ actionError.message }}
        </p>
        <BarberServicesPanel
          v-if="servicesOpenId === membership.id"
          :barbershop-id="barbershopId"
          :membership-id="membership.id"
          :barber-name="membership.barber.name"
        />
      </li>
    </ul>
  </section>
</template>
