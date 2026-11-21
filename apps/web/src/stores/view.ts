import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Visão escolhida na interface (R6): cliente, ou gerente/barbeiro de uma barbearia.
 * É só preferência de tela: o backend autoriza sempre pelo vínculo, nunca por ela.
 */
export type View = { kind: 'client' } | { kind: 'manager' | 'barber'; barbershopId: string }

export const CLIENT_VIEW: View = { kind: 'client' }
export const VIEW_STORAGE_KEY = 'shavey-view'

export const sameView = (a: View, b: View) =>
  a.kind === b.kind && (a.kind === 'client' || (b.kind !== 'client' && a.barbershopId === b.barbershopId))

function isView(value: unknown): value is View {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false
  if (value.kind === 'client') return true
  return (
    (value.kind === 'manager' || value.kind === 'barber') &&
    'barbershopId' in value &&
    typeof value.barbershopId === 'string'
  )
}

function loadSaved(): View {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) ?? 'null')
    return isView(saved) ? saved : CLIENT_VIEW
  } catch {
    return CLIENT_VIEW
  }
}

export const useViewStore = defineStore('view', () => {
  const selected = ref<View>(loadSaved())

  function select(view: View) {
    selected.value = view
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view))
    } catch {
      // armazenamento bloqueado: a escolha vale só nesta visita
    }
  }

  return { selected, select, reset: () => select(CLIENT_VIEW) }
})
