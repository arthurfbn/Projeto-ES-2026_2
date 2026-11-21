<script setup lang="ts">
import { reactive, ref } from 'vue'
import { WEEKDAYS, type WeeklyWindow } from '@shavey/contracts'
import { formErrorsFrom } from '@/features/conta/form-errors'
import { minutesToTime, timeToMinutes } from '@/lib/weekly-windows'

const props = defineProps<{
  barberName: string
  initial: readonly WeeklyWindow[]
  /** Grava o turno; se rejeitar, a mensagem da API aparece no formulário. */
  save: (windows: WeeklyWindow[]) => Promise<unknown>
}>()
const emit = defineEmits<{ cancel: [] }>()

/** Semana começando na segunda (0 = domingo, como no contrato, fica por último). */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

// Uma janela por dia na tela; a API aceita mais (ex.: com almoço) e o resumo mostra todas.
const days = reactive(
  DAY_ORDER.map((weekday) => {
    const window = props.initial.find((w) => w.weekday === weekday)
    return {
      weekday,
      name: WEEKDAYS[weekday],
      enabled: Boolean(window),
      start: window ? minutesToTime(window.startMinute) : '09:00',
      end: window ? minutesToTime(window.endMinute) : '18:00',
    }
  }),
)
const error = ref<string | null>(null)
const pending = ref(false)

/** Janelas dos dias marcados, ou a primeira mensagem de erro. */
function collect(): { windows: WeeklyWindow[] } | { error: string } {
  const windows: WeeklyWindow[] = []
  for (const day of days.filter((d) => d.enabled)) {
    const startMinute = timeToMinutes(day.start)
    const endMinute = timeToMinutes(day.end)
    if (Number.isNaN(startMinute) || Number.isNaN(endMinute)) return { error: `${day.name}: informe início e fim.` }
    if (startMinute % 15 !== 0 || endMinute % 15 !== 0) {
      return { error: `${day.name}: use horários de 15 em 15 minutos.` }
    }
    if (startMinute >= endMinute) return { error: `${day.name}: o início precisa ser antes do fim.` }
    windows.push({ weekday: day.weekday, startMinute, endMinute })
  }
  return { windows: windows.sort((a, b) => a.weekday - b.weekday) }
}

async function submit() {
  const result = collect()
  if ('error' in result) {
    error.value = result.error
    return
  }
  error.value = null
  pending.value = true
  try {
    await props.save(result.windows)
  } catch (failure) {
    const { fields, general } = formErrorsFrom(failure)
    error.value = fields.windows ?? general ?? 'Não deu certo. Tente de novo.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-3"
    :aria-label="`Turno de ${barberName}`"
    novalidate
    @submit.prevent="submit"
  >
    <p class="text-sm text-muted-foreground">
      Marque os dias e o horário em que {{ barberName }} pode abrir a agenda. Sem nenhum dia, fica sem turno.
    </p>
    <fieldset class="flex flex-col gap-2">
      <legend class="sr-only">
        Dias e horários do turno
      </legend>
      <div
        v-for="day in days"
        :key="day.weekday"
        class="grid grid-cols-[1fr_auto_auto] items-center gap-2"
      >
        <label class="flex items-center gap-2 font-semibold">
          <input
            v-model="day.enabled"
            type="checkbox"
            class="size-5 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :aria-label="day.name"
          >
          <span aria-hidden="true">{{ day.name }}</span>
        </label>
        <input
          v-model="day.start"
          type="time"
          step="900"
          :disabled="!day.enabled"
          :aria-label="`Início ${day.name}`"
          class="h-10 rounded-md border border-input bg-card px-2 tabular-nums disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
        >
        <input
          v-model="day.end"
          type="time"
          step="900"
          :disabled="!day.enabled"
          :aria-label="`Fim ${day.name}`"
          class="h-10 rounded-md border border-input bg-card px-2 tabular-nums disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
        >
      </div>
    </fieldset>
    <p
      v-if="error"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ error }}
    </p>
    <div class="flex gap-3">
      <button
        type="submit"
        class="h-11 flex-1 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        :disabled="pending"
      >
        {{ pending ? 'Salvando…' : 'Salvar turno' }}
      </button>
      <button
        type="button"
        class="h-11 rounded-md border border-input px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
    </div>
  </form>
</template>
