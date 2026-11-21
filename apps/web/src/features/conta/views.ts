import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { MeResponse } from '@shavey/contracts'
import { CLIENT_VIEW, sameView, useViewStore, type View } from '@/stores/view'
import { useMe } from './queries'

export type ViewOption = { view: View; label: string; to: RouteLocationRaw }

/** Visões que o usuário pode escolher (R5, R6): cliente e, por barbearia, gerente e/ou barbeiro. */
export function viewOptions(me: MeResponse): ViewOption[] {
  const options: ViewOption[] = [{ view: CLIENT_VIEW, label: 'Cliente', to: { name: 'home' } }]
  for (const profile of me.barbershops) {
    const to = { name: 'barbershop', params: { barbershopId: profile.barbershopId } }
    if (profile.manager) {
      options.push({
        view: { kind: 'manager', barbershopId: profile.barbershopId },
        label: `Gerente · ${profile.barbershopName}`,
        to,
      })
    }
    if (profile.barber) {
      options.push({
        view: { kind: 'barber', barbershopId: profile.barbershopId },
        label: `Barbeiro · ${profile.barbershopName}`,
        to,
      })
    }
  }
  return options
}

/** Visões disponíveis e a atual. Se a escolha salva deixou de valer (perdeu o perfil), volta para Cliente. */
export function useViews() {
  const { data: me } = useMe()
  const store = useViewStore()

  const options = computed(() => (me.value ? viewOptions(me.value) : []))
  const current = computed(
    () => options.value.find((option) => sameView(option.view, store.selected)) ?? options.value[0],
  )

  return { options, current, select: (view: View) => store.select(view) }
}
