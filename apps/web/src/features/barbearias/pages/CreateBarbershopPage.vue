<script setup lang="ts">
import { computed, reactive, useId } from 'vue'
import { useRouter } from 'vue-router'
import { createBarbershopRequestSchema } from '@shavey/contracts'
import AppHeader from '@/components/AppHeader.vue'
import TextField from '@/components/TextField.vue'
import { useFormErrors } from '@/features/conta/form-errors'
import { cepMask } from '@/lib/masks'
import { useCreateBarbershop } from '../queries'
import { useCepAutofill } from '../use-cep-autofill'

const router = useRouter()
const create = useCreateBarbershop()
const alsoBarberId = useId()

const form = reactive({
  name: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  alsoBarber: false,
})
// Mesmo contrato da API: CEP e UF errados aparecem no campo sem ida ao servidor (CA6).
const { errors, validateAll, setFromRequest, clearIfValid } = useFormErrors(createBarbershopRequestSchema)

// Endereço pelo CEP (#21): só ajuda de preenchimento; a validação continua a mesma.
const cep = useCepAutofill(form, (fields) => fields.forEach((field) => clearIfValid(field, form[field])))
const cepNotice = computed(() => {
  if (cep.status.value === 'not_found') return 'CEP não encontrado. Preencha o endereço abaixo.'
  if (cep.status.value === 'failed') return 'Não foi possível buscar o CEP agora. Preencha o endereço abaixo.'
  return undefined
})

async function submit() {
  if (!validateAll(form)) return
  try {
    const created = await create.mutateAsync(form)
    await router.push({ name: 'barbershop', params: { barbershopId: created.barbershop.id } })
  } catch (error) {
    setFromRequest(error, form)
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-6 sm:py-10">
    <AppHeader />
    <main class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-[2rem] font-extrabold leading-tight tracking-[-0.02em]">
          Criar barbearia
        </h1>
        <p class="text-muted-foreground">
          Você vira gerente dela. Depois cadastra os serviços e chama a equipe.
        </p>
      </div>

      <form
        class="flex flex-col gap-5 rounded-xl border bg-card p-5"
        novalidate
        @submit.prevent="submit"
      >
        <TextField
          v-model="form.name"
          label="Nome da barbearia"
          autocomplete="organization"
          :error="errors.fields.name"
          @blur="clearIfValid('name', form.name)"
        />
        <TextField
          v-model="form.cep"
          label="CEP"
          inputmode="numeric"
          autocomplete="postal-code"
          placeholder="01310-100"
          :mask="cepMask"
          :busy="cep.loading.value"
          :hint="cep.loading.value ? 'Buscando endereço…' : 'O endereço é preenchido pelo CEP.'"
          :error="errors.fields.cep ?? cepNotice"
          @blur="clearIfValid('cep', form.cep)"
        />
        <TextField
          v-model="form.street"
          :readonly="cep.isLocked('street')"
          label="Rua"
          autocomplete="address-line1"
          :error="errors.fields.street"
          @blur="clearIfValid('street', form.street)"
        />
        <div class="grid grid-cols-2 gap-4">
          <TextField
            v-model="form.number"
            label="Número"
            :error="errors.fields.number"
            @blur="clearIfValid('number', form.number)"
          />
          <TextField
            v-model="form.complement"
            label="Complemento"
            autocomplete="address-line2"
            hint="Opcional."
            :error="errors.fields.complement"
            @blur="clearIfValid('complement', form.complement)"
          />
        </div>
        <TextField
          v-model="form.neighborhood"
          :readonly="cep.isLocked('neighborhood')"
          label="Bairro"
          :error="errors.fields.neighborhood"
          @blur="clearIfValid('neighborhood', form.neighborhood)"
        />
        <div class="grid grid-cols-[1fr_6rem] gap-4">
          <TextField
            v-model="form.city"
            :readonly="cep.isLocked('city')"
            label="Cidade"
            autocomplete="address-level2"
            :error="errors.fields.city"
            @blur="clearIfValid('city', form.city)"
          />
          <TextField
            v-model="form.state"
            :readonly="cep.isLocked('state')"
            label="UF"
            autocomplete="address-level1"
            placeholder="SP"
            :error="errors.fields.state"
            @blur="clearIfValid('state', form.state)"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-start gap-3">
            <input
              :id="alsoBarberId"
              v-model="form.alsoBarber"
              type="checkbox"
              class="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :aria-invalid="errors.fields.alsoBarber ? 'true' : undefined"
              :aria-describedby="`${alsoBarberId}-msg`"
              @change="clearIfValid('alsoBarber', form.alsoBarber)"
            >
            <label
              :for="alsoBarberId"
              class="font-semibold"
            >Eu também atendo</label>
          </div>
          <p
            :id="`${alsoBarberId}-msg`"
            class="pl-8 text-sm"
            :class="errors.fields.alsoBarber ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{ errors.fields.alsoBarber ?? 'Você também fica como barbeiro desta barbearia.' }}
          </p>
        </div>

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
          :disabled="create.isPending.value"
        >
          {{ create.isPending.value ? 'Criando barbearia…' : 'Criar barbearia' }}
        </button>
      </form>
    </main>
  </div>
</template>
