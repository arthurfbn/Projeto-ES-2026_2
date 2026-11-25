<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { createAvailabilityRequestSchema, WEEKDAYS, type Availability } from '@shavey/contracts'
import { useFormErrors } from '@/features/conta/form-errors'
import { formatIsoDate, todaySaoPaulo } from '@/lib/dates'
import { minutesToTime, timeToMinutes } from '@/lib/weekly-windows'
import { useAvailabilities, useCreateAvailability, useRemoveAvailability } from '../queries'

const props = defineProps<{ membershipId: string; isActive: boolean }>()

const { data: availabilities, isPending, isError, refetch } = useAvailabilities(() => props.membershipId)
const create = useCreateAvailability(() => props.membershipId)
const remove = useRemoveAvailability(() => props.membershipId)

/** Semana começando na segunda (0 = domingo, como no contrato, fica por último). */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const form = reactive({ weekday: '1', start: '09:00', end: '18:00', validFrom: todaySaoPaulo(), validUntil: '' })
const removeError = ref<string | null>(null)

// Mesmo contrato da API: horário ou vigência inválidos aparecem sem ida ao servidor (R18).
const { errors, validateAll, setFromRequest } = useFormErrors(createAvailabilityRequestSchema)

const sorted = computed(() =>
  [...(availabilities.value ?? [])].sort(
    (a, b) =>
      DAY_ORDER.indexOf(a.weekday as (typeof DAY_ORDER)[number]) -
        DAY_ORDER.indexOf(b.weekday as (typeof DAY_ORDER)[number]) || a.startMinute - b.startMinute,
  ),
)

function describeValidity(availability: Availability) {
  const from = formatIsoDate(availability.validFrom)
  return availability.validUntil ? `de ${from} até ${formatIsoDate(availability.validUntil)}` : `a partir de ${from}`
}

function toRequest() {
  return {
    weekday: Number(form.weekday),
    startMinute: timeToMinutes(form.start),
    endMinute: timeToMinutes(form.end),
    validFrom: form.validFrom,
    validUntil: form.validUntil === '' ? null : form.validUntil,
  }
}

async function submit() {
  const request = toRequest()
  if (!validateAll(request)) return
  try {
    await create.mutateAsync(createAvailabilityRequestSchema.parse(request))
  } catch (error) {
    setFromRequest(error, request)
  }
}

async function removeOne(availability: Availability) {
  removeError.value = null
  try {
    await remove.mutateAsync(availability.id)
  } catch {
    removeError.value = 'Não foi possível remover o horário. Tente de novo.'
  }
}

const timeError = computed(() => errors.value.fields.startMinute ?? errors.value.fields.endMinute)
const dateError = computed(() => errors.value.fields.validFrom ?? errors.value.fields.validUntil)
const inputClass =
  'h-11 w-full rounded-md border border-input bg-card px-2 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-xl border bg-card p-5"
    aria-labelledby="availability-title"
    data-testid="availability"
  >
    <h2
      id="availability-title"
      class="font-display text-xl font-extrabold"
    >
      Minha disponibilidade
    </h2>

    <div
      v-if="isPending"
      class="h-16 animate-pulse rounded-md bg-muted"
      aria-label="Carregando sua disponibilidade"
    />
    <div
      v-else-if="isError"
      class="flex flex-col gap-2"
    >
      <p>Não foi possível carregar sua disponibilidade.</p>
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
        v-if="!sorted.length"
        class="text-muted-foreground"
      >
        Você ainda não abriu horários nesta barbearia.
      </p>
      <ul
        v-else
        class="flex flex-col divide-y divide-border"
      >
        <li
          v-for="availability in sorted"
          :key="availability.id"
          class="flex items-start justify-between gap-3 py-2"
        >
          <div class="flex flex-col">
            <span class="font-semibold tabular-nums">
              {{ WEEKDAYS[availability.weekday] }} · {{ minutesToTime(availability.startMinute) }}–{{
                minutesToTime(availability.endMinute)
              }}
            </span>
            <span class="text-sm text-muted-foreground">{{ describeValidity(availability) }}</span>
          </div>
          <button
            type="button"
            class="h-9 shrink-0 rounded-md border border-input px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            :disabled="remove.isPending.value"
            @click="removeOne(availability)"
          >
            Remover
          </button>
        </li>
      </ul>
      <p
        v-if="removeError"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ removeError }}
      </p>
    </template>

    <p
      v-if="!isActive"
      class="text-muted-foreground"
    >
      Este vínculo está inativo: não dá para abrir novos horários nele.
    </p>
    <form
      v-else
      class="flex flex-col gap-3 border-t pt-4"
      aria-label="Abrir horário"
      novalidate
      @submit.prevent="submit"
    >
      <h3 class="font-semibold">
        Abrir horário
      </h3>
      <div class="grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Dia
          <select
            v-model="form.weekday"
            aria-label="Dia da semana"
            :class="inputClass"
          >
            <option
              v-for="day in DAY_ORDER"
              :key="day"
              :value="String(day)"
            >
              {{ WEEKDAYS[day] }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Das
          <input
            v-model="form.start"
            type="time"
            step="900"
            aria-label="Início"
            :class="inputClass"
          >
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Às
          <input
            v-model="form.end"
            type="time"
            step="900"
            aria-label="Fim"
            :class="inputClass"
          >
        </label>
      </div>
      <p
        v-if="timeError"
        class="text-sm text-destructive"
      >
        {{ timeError }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Vale a partir de
          <input
            v-model="form.validFrom"
            type="date"
            aria-label="Vale a partir de"
            :class="inputClass"
          >
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Até (opcional)
          <input
            v-model="form.validUntil"
            type="date"
            aria-label="Até (opcional)"
            :class="inputClass"
          >
        </label>
      </div>
      <p
        v-if="dateError"
        class="text-sm text-destructive"
      >
        {{ dateError }}
      </p>
      <p
        v-if="errors.general"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ errors.general }}
      </p>
      <button
        type="submit"
        class="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        :disabled="create.isPending.value"
      >
        {{ create.isPending.value ? 'Salvando…' : 'Abrir horário' }}
      </button>
    </form>
  </section>
</template>
