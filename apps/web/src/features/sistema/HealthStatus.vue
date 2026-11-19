<script setup lang="ts">
import { computed } from 'vue'
import { useHealth } from './queries'

const { data, isPending, isError, refetch } = useHealth()

const label = computed(() => {
  if (isPending.value) return 'Ligando a máquina…'
  if (isError.value || !data.value) return 'Não foi possível falar com o servidor.'
  if (data.value.database === 'down') return 'Servidor no ar, banco de dados fora.'
  return 'Máquina ligada: servidor e banco no ar.'
})

const healthy = computed(() => data.value?.status === 'ok')
</script>

<template>
  <section
    class="rounded-xl border bg-card p-4 text-card-foreground"
    aria-live="polite"
  >
    <h2 class="text-lg font-extrabold">
      Status do sistema
    </h2>
    <p
      class="mt-1"
      :class="healthy ? 'text-foreground' : 'text-muted-foreground'"
      data-testid="health-label"
    >
      {{ label }}
    </p>
    <p
      v-if="data"
      class="mt-1 text-sm text-muted-foreground"
    >
      Versão {{ data.version }}
    </p>
    <button
      v-if="isError"
      type="button"
      class="mt-3 h-11 rounded-md bg-primary px-4 font-display font-extrabold text-primary-foreground"
      @click="refetch()"
    >
      Tentar de novo
    </button>
  </section>
</template>
