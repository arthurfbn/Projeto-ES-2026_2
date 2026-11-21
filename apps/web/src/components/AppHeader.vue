<script setup lang="ts">
import ViewSwitcher from '@/features/conta/components/ViewSwitcher.vue'
import BrandMark from './BrandMark.vue'
import ThemeToggle from './ThemeToggle.vue'
</script>

<template>
  <header class="flex items-center justify-between gap-3">
    <BrandMark />
    <div class="flex items-center gap-2">
      <!-- Só aparece para quem entrou (sem sessão, /me vem vazio). -->
      <ViewSwitcher />
      <ThemeToggle />
    </div>
  </header>
</template>
