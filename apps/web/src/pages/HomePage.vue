<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AccountPanel from '@/features/conta/components/AccountPanel.vue'
import HealthStatus from '@/features/sistema/HealthStatus.vue'
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-6 sm:py-10">
    <AppHeader />
    <main class="flex flex-col gap-6">
      <p class="font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[2.625rem]">
        Passa a máquina na fila.
      </p>
      <AccountPanel />
      <HealthStatus />
    </main>
  </div>
</template>
