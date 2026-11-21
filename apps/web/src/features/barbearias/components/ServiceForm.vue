<script setup lang="ts">
import { reactive } from 'vue'
import { createServiceRequestSchema, type CreateServiceRequest, type Service } from '@shavey/contracts'
import TextField from '@/components/TextField.vue'
import { useFormErrors } from '@/features/conta/form-errors'
import { centsToInput, parseMoneyToCents } from '@/lib/money'

const props = defineProps<{
  /** Nome acessível do formulário (há um de criação e um por serviço em edição). */
  label: string
  submitLabel: string
  pendingLabel: string
  /** Valores iniciais na edição. */
  initial?: Service
  /** Grava o serviço; se rejeitar, os erros aparecem nos campos. */
  save: (request: CreateServiceRequest) => Promise<unknown>
}>()
const emit = defineEmits<{ cancel: [] }>()

const blank = () => ({
  name: props.initial?.name ?? '',
  price: props.initial ? centsToInput(props.initial.priceCents) : '',
  duration: props.initial ? String(props.initial.durationMinutes) : '',
})
const form = reactive(blank())
const state = reactive({ pending: false })

// Mesmo contrato da API: preço e duração inválidos aparecem no campo sem ida ao servidor (CA7).
const { errors, validateAll, setFromRequest, clearIfValid } = useFormErrors(createServiceRequestSchema)

/** O que a pessoa digitou, no formato do contrato (centavos e minutos). */
function toRequest(): CreateServiceRequest {
  return {
    name: form.name,
    priceCents: parseMoneyToCents(form.price),
    durationMinutes: form.duration.trim() === '' ? Number.NaN : Number(form.duration),
  }
}

async function submit() {
  const request = toRequest()
  if (!validateAll(request)) return
  state.pending = true
  try {
    await props.save(createServiceRequestSchema.parse(request))
    if (!props.initial) Object.assign(form, blank())
  } catch (error) {
    setFromRequest(error, request)
  } finally {
    state.pending = false
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-4"
    :aria-label="label"
    novalidate
    @submit.prevent="submit"
  >
    <TextField
      v-model="form.name"
      label="Nome do serviço"
      placeholder="Corte"
      :error="errors.fields.name"
      @blur="clearIfValid('name', form.name)"
    />
    <div class="grid grid-cols-2 gap-4">
      <TextField
        v-model="form.price"
        label="Preço (R$)"
        inputmode="decimal"
        placeholder="40,00"
        :error="errors.fields.priceCents"
        @blur="clearIfValid('priceCents', toRequest().priceCents)"
      />
      <TextField
        v-model="form.duration"
        label="Duração (min)"
        inputmode="numeric"
        placeholder="30"
        hint="De 15 em 15."
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
        :disabled="state.pending"
      >
        {{ state.pending ? pendingLabel : submitLabel }}
      </button>
      <button
        v-if="initial"
        type="button"
        class="h-11 rounded-md border border-input px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
    </div>
  </form>
</template>
