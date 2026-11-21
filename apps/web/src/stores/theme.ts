import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

/** Mesma chave lida pelo script do index.html antes da primeira pintura. */
export const THEME_STORAGE_KEY = 'shavey-theme'

/** Preferência de tema: estado de interface, guardado só neste navegador. */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(document.documentElement.classList.contains('dark') ? 'dark' : 'light')

  function setTheme(next: Theme) {
    theme.value = next
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // navegação privada ou armazenamento bloqueado: o tema vale só nesta visita
    }
  }

  function toggle() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggle }
})
