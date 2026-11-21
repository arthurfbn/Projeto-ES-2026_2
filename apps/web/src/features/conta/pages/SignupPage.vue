<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fieldErrors, PASSWORD_MIN_LENGTH, signupRequestSchema } from '@shavey/contracts'
import BrandMark from '@/components/BrandMark.vue'
import TextField from '@/components/TextField.vue'
import { formErrorsFrom, type FormErrors } from '../form-errors'
import { useSignup } from '../queries'

const router = useRouter()
const signup = useSignup()

const form = reactive({ name: '', email: '', phone: '', password: '' })
const errors = ref<FormErrors>({ fields: {} })

async function submit() {
  // Mesmo contrato da API: erro de formato aparece sem ida ao servidor.
  const parsed = signupRequestSchema.safeParse(form)
  if (!parsed.success) {
    errors.value = { fields: fieldErrors(parsed.error) }
    return
  }
  errors.value = { fields: {} }
  try {
    await signup.mutateAsync(form)
    await router.push({ name: 'home' })
  } catch (error) {
    errors.value = formErrorsFrom(error)
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-10">
    <BrandMark />
    <header class="flex flex-col gap-2">
      <p class="font-display text-2xl font-extrabold">
        Passa a máquina na fila.
      </p>
      <h1 class="text-lg font-semibold">
        Crie sua conta
      </h1>
    </header>

    <form
      class="flex flex-col gap-4 rounded-xl border bg-card p-5"
      novalidate
      @submit.prevent="submit"
    >
      <TextField
        v-model="form.name"
        label="Nome"
        autocomplete="name"
        :error="errors.fields.name"
      />
      <TextField
        v-model="form.email"
        label="E-mail"
        type="email"
        autocomplete="email"
        :error="errors.fields.email"
      />
      <TextField
        v-model="form.phone"
        label="Telefone"
        type="tel"
        autocomplete="tel-national"
        hint="Com DDD, ex.: (11) 98765-4321"
        :error="errors.fields.phone"
      />
      <TextField
        v-model="form.password"
        label="Senha"
        type="password"
        autocomplete="new-password"
        :hint="`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`"
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
        :disabled="signup.isPending.value"
      >
        {{ signup.isPending.value ? 'Criando conta…' : 'Criar conta' }}
      </button>
    </form>

    <p class="text-center text-sm">
      Já tem conta?
      <RouterLink
        :to="{ name: 'login' }"
        class="font-semibold underline underline-offset-4"
      >
        Entrar
      </RouterLink>
    </p>
  </main>
</template>
