<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fieldErrors, loginRequestSchema } from '@shavey/contracts'
import BrandMark from '@/components/BrandMark.vue'
import TextField from '@/components/TextField.vue'
import { formErrorsFrom, type FormErrors } from '../form-errors'
import { useLogin } from '../queries'

const router = useRouter()
const login = useLogin()

const form = reactive({ email: '', password: '' })
const errors = ref<FormErrors>({ fields: {} })

async function submit() {
  const parsed = loginRequestSchema.safeParse(form)
  if (!parsed.success) {
    errors.value = { fields: fieldErrors(parsed.error) }
    return
  }
  errors.value = { fields: {} }
  try {
    await login.mutateAsync(form)
    await router.push({ name: 'home' })
  } catch (error) {
    errors.value = formErrorsFrom(error)
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-10">
    <BrandMark />
    <h1 class="text-2xl font-extrabold">
      Entrar
    </h1>

    <form
      class="flex flex-col gap-4 rounded-xl border bg-card p-5"
      novalidate
      @submit.prevent="submit"
    >
      <TextField
        v-model="form.email"
        label="E-mail"
        type="email"
        autocomplete="email"
        :error="errors.fields.email"
      />
      <TextField
        v-model="form.password"
        label="Senha"
        type="password"
        autocomplete="current-password"
        :error="errors.fields.password"
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
        class="h-11 rounded-md bg-primary px-4 font-display font-extrabold text-primary-foreground disabled:opacity-60"
        :disabled="login.isPending.value"
      >
        {{ login.isPending.value ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <p class="text-center text-sm">
      Ainda não tem conta?
      <RouterLink
        :to="{ name: 'signup' }"
        class="font-semibold underline underline-offset-4"
      >
        Criar conta
      </RouterLink>
    </p>
  </main>
</template>
