<script setup lang="ts">
// Arquivo de public/: por binding, o compilador não tenta importá-lo como módulo (quebra nos testes).
const logoSrc = '/favicon.svg'
</script>

<template>
  <RouterLink
    to="/"
    class="flex items-center gap-3 self-start rounded-md focus-visible:outline-2 focus-visible:outline-ring"
    aria-label="Shavey, página inicial"
  >
    <img
      :src="logoSrc"
      alt=""
      width="33"
      height="45"
    >
    <span class="font-display text-4xl font-extrabold leading-none">
      shave<span class="text-pole-red">y</span>
    </span>
  </RouterLink>
</template>
