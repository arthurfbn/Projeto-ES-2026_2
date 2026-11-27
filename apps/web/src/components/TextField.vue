<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { countDigits, positionAfterDigits, removeDigitAt, type DigitMask } from '@/lib/masks'

const props = defineProps<{
  /** Máscara numérica aplicada enquanto digita (ex.: telefone). */
  mask?: DigitMask
  label: string
  type?: 'text' | 'email' | 'tel' | 'password'
  autocomplete?: string
  placeholder?: string
  inputmode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal'
  error?: string
  hint?: string
  /** Preenchido pelo sistema (ex.: endereço do CEP): visível e focável, mas não editável. */
  readonly?: boolean
  /** Busca em andamento ligada ao campo (ex.: CEP): mostra indicador e marca aria-busy. */
  busy?: boolean
}>()

const emit = defineEmits<{ blur: [] }>()
const model = defineModel<string>({ required: true })
const id = useId()

const isPassword = computed(() => props.type === 'password')
const showPassword = ref(false)
const inputType = computed(() => (isPassword.value && showPassword.value ? 'text' : (props.type ?? 'text')))
const messageId = computed(() => (props.error || props.hint ? `${id}-msg` : undefined))

/**
 * Com máscara: só dígitos entram, o texto é reformatado a cada tecla e o cursor fica depois do
 * mesmo dígito em que estava. Apagar sobre "(", ")" ou "-" apaga o dígito anterior (senão o cursor trava).
 */
function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (!props.mask) {
    model.value = input.value
    return
  }
  let raw = input.value
  let caret = input.selectionStart ?? raw.length
  const deletingBackward = event instanceof InputEvent && event.inputType === 'deleteContentBackward'
  if (deletingBackward && countDigits(raw) === countDigits(model.value)) {
    const digitsBefore = countDigits(raw.slice(0, caret))
    raw = removeDigitAt(raw, digitsBefore)
    caret = positionAfterDigits(raw, digitsBefore - 1)
  }
  const digitsBeforeCaret = countDigits(raw.slice(0, caret))
  const formatted = props.mask.format(raw)
  model.value = formatted
  input.value = formatted
  const position = positionAfterDigits(formatted, digitsBeforeCaret)
  if (document.activeElement === input) input.setSelectionRange(position, position)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      :for="id"
      class="text-sm font-semibold"
    >{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        :value="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :inputmode="inputmode"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="messageId"
        :aria-busy="busy ? 'true' : undefined"
        :readonly="readonly"
        class="h-12 w-full rounded-md border bg-card px-3 text-foreground placeholder:text-muted-foreground/70 read-only:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        :class="[error ? 'border-destructive' : 'border-input', isPassword || busy ? 'pr-12' : '']"
        @input="onInput"
        @blur="emit('blur')"
      >
      <span
        v-if="busy"
        class="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        <span class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </span>
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="showPassword"
        :aria-controls="id"
        @click="showPassword = !showPassword"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle
            cx="12"
            cy="12"
            r="3"
          />
          <path
            v-if="showPassword"
            d="M3 3l18 18"
          />
        </svg>
      </button>
    </div>
    <p
      v-if="error"
      :id="messageId"
      class="text-sm text-destructive"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="messageId"
      class="text-sm text-muted-foreground"
    >
      {{ hint }}
    </p>
  </div>
</template>
