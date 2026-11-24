<script setup lang="ts">
/** Ícones da navbar (traço, herdam a cor do texto). Decorativos: o rótulo vem do texto ao lado. */
defineProps<{ name: 'home' | 'create' | 'logout' }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    class="size-6 shrink-0"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </template>
    <template v-else-if="name === 'create'">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
      />
      <path d="M12 8v8M8 12h8" />
    </template>
    <template v-else>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </template>
  </svg>
</template>
