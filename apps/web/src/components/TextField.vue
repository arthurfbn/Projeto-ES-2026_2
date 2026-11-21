<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label: string
  type?: 'text' | 'email' | 'tel' | 'password'
  autocomplete?: string
  error?: string
  hint?: string
}>()

const model = defineModel<string>({ required: true })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label
      :for="id"
      class="text-sm font-semibold"
    >{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error || hint ? `${id}-msg` : undefined"
      class="h-11 rounded-md border bg-card px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="error ? 'border-destructive' : 'border-input'"
    >
    <p
      v-if="error"
      :id="`${id}-msg`"
      class="text-sm text-destructive"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="`${id}-msg`"
      class="text-sm text-muted-foreground"
    >
      {{ hint }}
    </p>
  </div>
</template>
