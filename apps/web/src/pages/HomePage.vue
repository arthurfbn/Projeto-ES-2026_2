<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue'
import AccountPanel from '@/features/conta/components/AccountPanel.vue'
import HealthStatus from '@/features/sistema/HealthStatus.vue'
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-4 py-12">
    <BrandMark />
    <p class="font-display text-xl font-semibold">
      Passa a máquina na fila.
    </p>
    <AccountPanel />
    <HealthStatus />
  </main>
</template>
