<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
// Símbolo sobre fundo claro ou negativo sobre marinho (docs/design-system.md, "Marca").
// Por binding, o compilador não tenta importar o arquivo de public/ como módulo.
const logoSrc = computed(() => (themeStore.theme === 'dark' ? '/logo-negativo.svg' : '/logo.svg'))
</script>

<template>
  <RouterLink
    to="/"
    class="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    aria-label="Shavey, página inicial"
  >
    <img
      :src="logoSrc"
      alt=""
      width="30"
      height="41"
      data-testid="brand-logo"
    >
    <span class="font-display text-[2rem] font-extrabold leading-none tracking-[-0.04em]">
      shave<span class="text-wordmark-accent">y</span>
    </span>
  </RouterLink>
</template>
