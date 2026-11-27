import { QueryClient } from '@tanstack/vue-query'

/** Instância única: o plugin do Vue e o guard do router compartilham o mesmo cache. */
export const queryClient = new QueryClient()
