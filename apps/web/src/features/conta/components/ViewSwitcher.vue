<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sameView } from '@/stores/view'
import { useViews, type ViewOption } from '../views'

const router = useRouter()
const { options, current, select } = useViews()
const open = ref(false)
const root = ref<HTMLElement>()
const menuId = useId()

async function choose(option: ViewOption) {
  select(option.view)
  open.value = false
  await router.push(option.to)
}

function onOutsideClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('click', onOutsideClick)
  else document.removeEventListener('click', onOutsideClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>

<template>
  <div
    v-if="current"
    ref="root"
    class="relative"
    @keydown.escape="open = false"
  >
    <button
      type="button"
      class="flex h-11 max-w-44 items-center gap-2 rounded-md border bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:max-w-64"
      :aria-expanded="open"
      :aria-controls="menuId"
      aria-haspopup="true"
      :title="`Visão: ${current.label}`"
      data-testid="view-switcher"
      @click="open = !open"
    >
      <span class="sr-only">Visão:</span>
      <span class="truncate">{{ current.label }}</span>
      <svg
        viewBox="0 0 24 24"
        class="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <ul
      v-show="open"
      :id="menuId"
      class="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-1 rounded-lg border bg-popover p-1 text-popover-foreground"
      aria-label="Trocar de visão"
    >
      <li
        v-for="option in options"
        :key="option.label"
      >
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          :aria-current="sameView(option.view, current.view) ? 'true' : undefined"
          @click="choose(option)"
        >
          <span
            class="w-4 shrink-0 text-center"
            aria-hidden="true"
          >{{ sameView(option.view, current.view) ? '✓' : '' }}</span>
          <span class="truncate">{{ option.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
