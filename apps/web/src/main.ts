import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { queryClient } from './lib/query-client'
import { createAppRouter } from './router'
import './styles/main.css'

createApp(App)
  .use(createPinia())
  .use(createAppRouter(queryClient))
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
