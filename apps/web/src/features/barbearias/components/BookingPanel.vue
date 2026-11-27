<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Appointment, PageService, Slot } from '@shavey/contracts'
import { ApiError } from '@/lib/http'
import { formatTime, nextDays, todaySaoPaulo } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { useCreateAppointment, useSlots } from '../queries'

/**
 * Agendar um serviço (spec 003, R5–R11): barbeiro ou "qualquer barbeiro" → dia → horário →
 * pagar no local. O barbeiro atribuído e o preço aparecem antes de confirmar (ADR-0023).
 */
const props = defineProps<{ barbershopId: string; service: PageService }>()
const emit = defineEmits<{ close: [] }>()

const ANY = 'any'
const barberChoice = ref<string>(ANY)
const days = nextDays(todaySaoPaulo(), 14)
const date = ref(days[0]?.date ?? todaySaoPaulo())
const selected = ref<Slot | null>(null)
const booked = ref<Appointment | null>(null)

const slotsInput = computed(() => ({
  barbershopId: props.barbershopId,
  serviceId: props.service.id,
  date: date.value,
  ...(barberChoice.value === ANY ? {} : { membershipId: barberChoice.value }),
}))
const { data: slots, isPending, isError, refetch } = useSlots(slotsInput)
const booking = useCreateAppointment(() => props.barbershopId)

watch([barberChoice, date], () => {
  selected.value = null
  booking.reset()
})

const prices = computed(() => props.service.barbers.map((barber) => barber.priceCents))
const fromPrice = computed(() => Math.min(...prices.value))
const pricesDiffer = computed(() => new Set(prices.value).size > 1)
const bookingError = computed(() => {
  const error = booking.error.value
  if (!error) return null
  return error instanceof ApiError && error.error?.message ? error.error.message : 'Não foi possível agendar. Tente de novo.'
})

async function confirm() {
  if (!selected.value) return
  try {
    const { appointment } = await booking.mutateAsync({
      serviceId: props.service.id,
      startsAt: selected.value.startsAt,
      paymentMethod: 'on_site',
      ...(barberChoice.value === ANY ? {} : { membershipId: barberChoice.value }),
    })
    booked.value = appointment
  } catch {
    // Horário tomado por outro cliente: a lista é recarregada e a mensagem aparece.
    selected.value = null
  }
}

const dayLabel = (iso: string) => days.find((day) => day.date === date.value)?.label ?? iso
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-xl border bg-card p-4"
    :aria-label="`Agendar ${service.name}`"
  >
    <div
      v-if="booked"
      class="flex flex-col gap-3"
      role="status"
    >
      <p class="font-display text-xl font-extrabold">
        Horário marcado.
      </p>
      <p>
        {{ service.name }} com {{ booked.barber.name }}, {{ dayLabel(booked.startsAt) }} às
        {{ formatTime(booked.startsAt) }}. {{ formatCents(booked.priceCents) }}, pagamento no local.
      </p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="emit('close')"
      >
        Fechar
      </button>
    </div>

    <template v-else>
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 font-semibold">
          Com quem
        </legend>
        <label class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <span class="flex items-center gap-2">
            <input
              v-model="barberChoice"
              type="radio"
              :value="ANY"
            >
            Qualquer barbeiro
          </span>
          <span class="text-sm text-muted-foreground tabular-nums">
            {{ pricesDiffer ? `a partir de ${formatCents(fromPrice)}` : formatCents(fromPrice) }}
          </span>
        </label>
        <label
          v-for="barber in service.barbers"
          :key="barber.membershipId"
          class="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
        >
          <span class="flex items-center gap-2">
            <input
              v-model="barberChoice"
              type="radio"
              :value="barber.membershipId"
            >
            {{ barber.name }}
          </span>
          <span class="text-sm text-muted-foreground tabular-nums">{{ formatCents(barber.priceCents) }}</span>
        </label>
      </fieldset>

      <div class="flex flex-col gap-2">
        <span class="font-semibold">Dia</span>
        <ul
          class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          aria-label="Dias"
        >
          <li
            v-for="day in days"
            :key="day.date"
            class="shrink-0"
          >
            <button
              type="button"
              :aria-pressed="date === day.date"
              class="h-10 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="date === day.date ? 'border-accent bg-accent text-accent-foreground' : 'bg-card'"
              @click="date = day.date"
            >
              {{ day.label }}
            </button>
          </li>
        </ul>
      </div>

      <div
        class="flex flex-col gap-2"
        aria-live="polite"
      >
        <span class="font-semibold">Horário</span>
        <div
          v-if="isPending"
          class="h-16 animate-pulse rounded-md bg-muted"
          aria-label="Carregando horários"
        />
        <div
          v-else-if="isError"
          class="flex flex-col gap-2"
        >
          <p>Não foi possível carregar os horários.</p>
          <button
            type="button"
            class="h-11 self-start rounded-md border px-4 font-semibold"
            @click="refetch()"
          >
            Tentar de novo
          </button>
        </div>
        <p
          v-else-if="!slots?.slots.length"
          class="text-muted-foreground"
        >
          Sem horário livre neste dia. Tente outro.
        </p>
        <ul
          v-else
          class="grid grid-cols-4 gap-2"
          aria-label="Horários livres"
        >
          <li
            v-for="slot in slots.slots"
            :key="slot.startsAt"
          >
            <button
              type="button"
              :aria-pressed="selected?.startsAt === slot.startsAt"
              class="h-10 w-full rounded-md border text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :class="selected?.startsAt === slot.startsAt ? 'border-accent bg-accent text-accent-foreground' : 'bg-card'"
              @click="selected = slot"
            >
              {{ formatTime(slot.startsAt) }}
            </button>
          </li>
        </ul>
      </div>

      <p
        v-if="bookingError"
        class="text-destructive"
        role="alert"
      >
        {{ bookingError }}
      </p>

      <div
        v-if="selected"
        class="flex flex-col gap-3 border-t pt-4"
      >
        <p data-testid="booking-summary">
          {{ service.name }} com <strong>{{ selected.barber.name }}</strong>, {{ dayLabel(selected.startsAt) }} às
          {{ formatTime(selected.startsAt) }} · {{ formatCents(selected.barber.priceCents) }} ·
          {{ selected.barber.durationMinutes }} min
        </p>
        <p class="text-sm text-muted-foreground">
          Pagamento no local, na barbearia.
        </p>
        <button
          type="button"
          class="flex h-13 items-center justify-center rounded-md bg-primary px-4 font-display text-lg font-extrabold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          :disabled="booking.isPending.value"
          @click="confirm"
        >
          Confirmar agendamento
        </button>
      </div>
    </template>
  </section>
</template>
