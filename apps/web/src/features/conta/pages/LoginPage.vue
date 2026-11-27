<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { loginRequestSchema } from '@shavey/contracts'
import TextField from '@/components/TextField.vue'
import AuthLayout from '../components/AuthLayout.vue'
import { useFormErrors } from '../form-errors'
import { useLogin } from '../queries'

const router = useRouter()
const login = useLogin()

const form = reactive({ email: '', password: '' })
const { errors, validateAll, setFromRequest, clearIfValid } = useFormErrors(loginRequestSchema)

async function submit() {
  if (!validateAll(form)) return
  try {
    await login.mutateAsync(form)
    await router.push({ name: 'home' })
  } catch (error) {
    setFromRequest(error, form)
  }
}
</script>

<template>
  <AuthLayout
    tagline="Máquina ligada, horário marcado."
    title="Entrar"
    intro="Acesse sua conta para ver e marcar horários."
  >
    <form
      class="flex flex-col gap-5"
      novalidate
      @submit.prevent="submit"
    >
      <TextField
        v-model="form.email"
        label="E-mail"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="nome@exemplo.com"
        :error="errors.fields.email"
        @blur="clearIfValid('email', form.email)"
      />
      <TextField
        v-model="form.password"
        label="Senha"
        type="password"
        autocomplete="current-password"
        :error="errors.fields.password"
        @blur="clearIfValid('password', form.password)"
      />
      <p
        v-if="errors.general"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ errors.general }}
      </p>
      <button
        type="submit"
        class="h-13 rounded-md bg-primary px-4 font-display text-lg font-extrabold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        :disabled="login.isPending.value"
      >
        {{ login.isPending.value ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <template #footer>
      Ainda não tem conta?
      <RouterLink
        :to="{ name: 'signup' }"
        class="font-semibold underline underline-offset-4"
      >
        Criar conta
      </RouterLink>
    </template>
  </AuthLayout>
</template>
