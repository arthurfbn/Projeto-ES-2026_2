<script setup lang="ts">
import HealthStatus from '@/features/sistema/HealthStatus.vue'
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-5 py-12">
    <header class="flex items-center gap-3">
      <img
        src="/favicon.svg"
        alt=""
        width="44"
        height="60"
      >
      <h1 class="text-5xl font-extrabold leading-none">
        shave<span class="text-pole-red">y</span>
      </h1>
    </header>
    <p class="text-xl font-display font-semibold">
      Passa a máquina na fila.
    </p>
    <HealthStatus />
  </main>
</template>
