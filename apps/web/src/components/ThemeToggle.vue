<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.theme === 'dark')
</script>

<template>
  <button
    type="button"
    class="flex size-11 items-center justify-center rounded-md border bg-card text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    :aria-label="isDark ? 'Usar tema claro' : 'Usar tema escuro'"
    :title="isDark ? 'Tema claro' : 'Tema escuro'"
    @click="themeStore.toggle()"
  >
    <!-- No escuro mostra o sol (ir para o claro); no claro, a lua. -->
    <svg
      v-if="isDark"
      data-testid="icon-sun"
      viewBox="0 0 24 24"
      class="size-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
      />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
    <svg
      v-else
      data-testid="icon-moon"
      viewBox="0 0 24 24"
      class="size-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>
