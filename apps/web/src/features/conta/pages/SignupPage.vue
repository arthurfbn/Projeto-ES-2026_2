<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { PASSWORD_MIN_LENGTH, signupRequestSchema } from '@shavey/contracts'
import TextField from '@/components/TextField.vue'
import { phoneMask } from '@/lib/masks'
import AuthLayout from '../components/AuthLayout.vue'
import { useFormErrors } from '../form-errors'
import { useSignup } from '../queries'

const router = useRouter()
const signup = useSignup()

const form = reactive({ name: '', email: '', phone: '', password: '' })
// Mesmo contrato da API: erro de formato aparece sem ida ao servidor.
const { errors, validateAll, setFromRequest, clearIfValid } = useFormErrors(signupRequestSchema)

async function submit() {
  if (!validateAll(form)) return
  try {
    await signup.mutateAsync(form)
    await router.push({ name: 'home' })
  } catch (error) {
    setFromRequest(error, form)
  }
}
</script>

<template>
  <AuthLayout
    tagline="Passa a máquina na fila."
    title="Criar conta"
    intro="Uma conta só para agendar em qualquer barbearia."
  >
    <form
      class="flex flex-col gap-5"
      novalidate
      @submit.prevent="submit"
    >
      <TextField
        v-model="form.name"
        label="Nome"
        autocomplete="name"
        :error="errors.fields.name"
        @blur="clearIfValid('name', form.name)"
      />
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
        v-model="form.phone"
        label="Telefone"
        type="tel"
        inputmode="tel"
        autocomplete="tel-national"
        placeholder="(11) 98765-4321"
        hint="Com DDD."
        :mask="phoneMask"
        :error="errors.fields.phone"
        @blur="clearIfValid('phone', form.phone)"
      />
      <TextField
        v-model="form.password"
        label="Senha"
        type="password"
        autocomplete="new-password"
        :placeholder="`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`"
        :hint="`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`"
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
        :disabled="signup.isPending.value"
      >
        {{ signup.isPending.value ? 'Criando conta…' : 'Criar conta' }}
      </button>
    </form>

    <template #footer>
      Já tem conta?
      <RouterLink
        :to="{ name: 'login' }"
        class="font-semibold underline underline-offset-4"
      >
        Entrar
      </RouterLink>
    </template>
  </AuthLayout>
</template>
