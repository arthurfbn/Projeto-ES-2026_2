<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'

defineProps<{ tagline: string; title: string; intro: string }>()
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-4 py-6 sm:py-10">
    <AppHeader />
    <main class="flex flex-col gap-6">
      <section class="flex flex-col gap-3">
        <p class="font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[2.625rem]">
          {{ tagline }}
        </p>
        <span
          class="h-1 w-12 rounded-full bg-accent"
          aria-hidden="true"
        />
        <h1 class="text-xl font-extrabold">
          {{ title }}
        </h1>
        <p class="text-muted-foreground">
          {{ intro }}
        </p>
      </section>
      <div class="rounded-xl border bg-card p-5 text-card-foreground sm:p-6">
        <slot />
      </div>
      <p class="text-center text-sm">
        <slot name="footer" />
      </p>
    </main>
  </div>
</template>
