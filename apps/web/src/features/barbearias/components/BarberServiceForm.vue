<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue'
import { setBarberServiceRequestSchema, type SetBarberServiceRequest, type Service } from '@shavey/contracts'
import TextField from '@/components/TextField.vue'
import { useFormErrors } from '@/features/conta/form-errors'
import { centsToInput, formatCents, parseMoneyToCents } from '@/lib/money'

const props = defineProps<{
  /** Nome acessível do formulário. */
  label: string
  submitLabel: string
  /** Criação: serviços que podem ser escolhidos. Edição: o serviço fixo em `service`. */
  options?: Service[]
  /** Edição: serviço já atribuído, com os valores próprios atuais. */
  service?: Pick<Service, 'id' | 'name' | 'priceCents' | 'durationMinutes'>
  initial?: { priceCents: number | null; durationMinutes: number | null }
  save: (serviceId: string, input: SetBarberServiceRequest) => Promise<unknown>
}>()
const emit = defineEmits<{ cancel: [] }>()

const selectId = useId()
const selectedId = ref(props.service?.id ?? '')
const form = reactive({
  price: props.initial?.priceCents != null ? centsToInput(props.initial.priceCents) : '',
  duration: props.initial?.durationMinutes != null ? String(props.initial.durationMinutes) : '',
})
const selectError = ref<string | null>(null)
const pending = ref(false)

// Mesmo contrato da API: duração própria fora do R9 aparece no campo sem ida ao servidor.
const { errors, validateAll, setFromRequest, clearIfValid } = useFormErrors(setBarberServiceRequestSchema)

/** Padrão do serviço escolhido, mostrado como referência (vazio = vale o padrão). */
const defaults = computed(() => props.service ?? props.options?.find((option) => option.id === selectedId.value))

/** Campos vazios viram null: vale o padrão do serviço (R16). */
function toRequest() {
  return {
    priceCents: form.price.trim() === '' ? null : parseMoneyToCents(form.price),
    durationMinutes: form.duration.trim() === '' ? null : Number(form.duration),
  }
}

async function submit() {
  selectError.value = selectedId.value ? null : 'Escolha um serviço.'
  const request = toRequest()
  if (!validateAll(request) || selectError.value) return
  pending.value = true
  try {
    await props.save(selectedId.value, setBarberServiceRequestSchema.parse(request))
    if (!props.service) {
      selectedId.value = ''
      Object.assign(form, { price: '', duration: '' })
    }
  } catch (error) {
    setFromRequest(error, request)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-3"
    :aria-label="label"
    novalidate
    @submit.prevent="submit"
  >
    <div
      v-if="options"
      class="flex flex-col gap-1.5"
    >
      <label
        :for="selectId"
        class="text-sm font-semibold"
      >Serviço</label>
      <select
        :id="selectId"
        v-model="selectedId"
        class="h-12 rounded-md border border-input bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        :aria-invalid="selectError ? 'true' : undefined"
      >
        <option
          value=""
          disabled
        >
          Escolha um serviço
        </option>
        <option
          v-for="option in options"
          :key="option.id"
          :value="option.id"
        >
          {{ option.name }}
        </option>
      </select>
      <p
        v-if="selectError"
        class="text-sm text-destructive"
      >
        {{ selectError }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <TextField
        v-model="form.price"
        label="Preço próprio (R$)"
        inputmode="decimal"
        :placeholder="defaults ? centsToInput(defaults.priceCents) : ''"
        :hint="defaults ? `Vazio = padrão (${formatCents(defaults.priceCents)}).` : 'Vazio = padrão.'"
        :error="errors.fields.priceCents"
        @blur="clearIfValid('priceCents', toRequest().priceCents)"
      />
      <TextField
        v-model="form.duration"
        label="Duração própria (min)"
        inputmode="numeric"
        :placeholder="defaults ? String(defaults.durationMinutes) : ''"
        :hint="defaults ? `Vazio = padrão (${defaults.durationMinutes} min).` : 'Vazio = padrão.'"
        :error="errors.fields.durationMinutes"
        @blur="clearIfValid('durationMinutes', toRequest().durationMinutes)"
      />
    </div>
    <p
      v-if="errors.general"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ errors.general }}
    </p>
    <div class="flex gap-3">
      <button
        type="submit"
        class="h-11 flex-1 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        :disabled="pending"
      >
        {{ pending ? 'Salvando…' : submitLabel }}
      </button>
      <button
        v-if="service"
        type="button"
        class="h-11 rounded-md border border-input px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
    </div>
  </form>
</template>
