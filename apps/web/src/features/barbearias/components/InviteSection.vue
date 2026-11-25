<script setup lang="ts">
import { reactive, ref, useId } from 'vue'
import { createInvitationRequestSchema, type InvitationKind } from '@shavey/contracts'
import TextField from '@/components/TextField.vue'
import { useFormErrors } from '@/features/conta/form-errors'
import { formatDayMonth } from '@/lib/dates'
import { formErrorsFrom } from '@/features/conta/form-errors'
import { useCancelInvitation, useInviteToBarbershop, useSentInvitations } from '../queries'

const props = defineProps<{ barbershopId: string }>()

const invite = useInviteToBarbershop(() => props.barbershopId)
// R13: pendentes enviados, para acompanhar e cancelar.
const { data: pending, isError: pendingFailed, refetch: refetchPending } = useSentInvitations(() => props.barbershopId)
const cancel = useCancelInvitation(() => props.barbershopId)
const cancelError = ref<string | null>(null)

async function cancelInvitation(id: string) {
  cancelError.value = null
  try {
    await cancel.mutateAsync(id)
  } catch (error) {
    cancelError.value = formErrorsFrom(error).general ?? 'Não foi possível cancelar o convite. Tente de novo.'
  }
}

const roleLabel = (kind: InvitationKind, isExclusive: boolean) =>
  kind === 'manager' ? 'Gerente' : isExclusive ? 'Barbeiro · vínculo exclusivo' : 'Barbeiro'
const exclusiveId = useId()

const kinds: Array<{ value: InvitationKind; label: string }> = [
  { value: 'barber', label: 'Barbeiro' },
  { value: 'manager', label: 'Gerente' },
]

const blank = () => ({ email: '', kind: 'barber' as InvitationKind, isExclusive: false })
const form = reactive(blank())
const sent = ref<string | null>(null)

// Mesmo contrato da API: e-mail inválido aparece no campo sem ida ao servidor.
const { errors, validateAll, setFromRequest, clearIfValid } = useFormErrors(createInvitationRequestSchema)

/** Exclusividade só existe no convite de barbeiro (R10). */
const toRequest = () => ({ ...form, isExclusive: form.kind === 'barber' && form.isExclusive })

async function submit() {
  sent.value = null
  const request = toRequest()
  if (!validateAll(request)) return
  try {
    const invitation = await invite.mutateAsync(createInvitationRequestSchema.parse(request))
    const role = invitation.kind === 'barber' ? 'barbeiro' : 'gerente'
    sent.value = `Convite de ${role} enviado para ${form.email.trim()}. Vale até ${formatDayMonth(invitation.expiresAt)}.`
    Object.assign(form, blank())
  } catch (error) {
    setFromRequest(error, request)
  }
}
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-xl border bg-card p-5"
    aria-labelledby="invite-title"
  >
    <div class="flex flex-col gap-1">
      <h2
        id="invite-title"
        class="font-display text-2xl font-extrabold"
      >
        Convites
      </h2>
      <p class="text-sm text-muted-foreground">
        Convide quem já tem conta no Shavey. A pessoa entra na equipe quando aceitar.
      </p>
    </div>

    <form
      class="flex flex-col gap-4"
      aria-label="Convidar para a equipe"
      novalidate
      @submit.prevent="submit"
    >
      <TextField
        v-model="form.email"
        label="E-mail de quem você quer convidar"
        type="email"
        autocomplete="off"
        :error="errors.fields.email"
        @blur="clearIfValid('email', form.email)"
      />

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 font-semibold">
          Convidar como
        </legend>
        <div class="flex gap-3">
          <label
            v-for="kind in kinds"
            :key="kind.value"
            class="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-4 font-semibold has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <input
              v-model="form.kind"
              type="radio"
              name="invitation-kind"
              :value="kind.value"
              class="sr-only"
            >
            {{ kind.label }}
          </label>
        </div>
      </fieldset>

      <div
        v-if="form.kind === 'barber'"
        class="flex flex-col gap-1.5"
      >
        <div class="flex items-start gap-3">
          <input
            :id="exclusiveId"
            v-model="form.isExclusive"
            type="checkbox"
            class="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :aria-describedby="`${exclusiveId}-msg`"
          >
          <label
            :for="exclusiveId"
            class="font-semibold"
          >Vínculo exclusivo</label>
        </div>
        <p
          :id="`${exclusiveId}-msg`"
          class="pl-8 text-sm text-muted-foreground"
        >
          O barbeiro só atende nesta barbearia enquanto o vínculo estiver ativo.
        </p>
      </div>

      <p
        v-if="errors.general"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ errors.general }}
      </p>
      <p
        v-if="sent"
        role="status"
        class="text-sm font-semibold"
      >
        {{ sent }}
      </p>

      <button
        type="submit"
        class="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        :disabled="invite.isPending.value"
      >
        {{ invite.isPending.value ? 'Enviando convite…' : 'Enviar convite' }}
      </button>
    </form>

    <div
      v-if="pendingFailed"
      class="flex flex-col gap-3 border-t pt-4"
    >
      <p>Não foi possível carregar os convites pendentes.</p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="refetchPending()"
      >
        Tentar de novo
      </button>
    </div>

    <div
      v-else-if="pending?.length"
      class="flex flex-col gap-2 border-t pt-4"
    >
      <h3 class="font-semibold">
        Aguardando resposta
      </h3>
      <ul
        class="flex flex-col divide-y divide-border"
        data-testid="sent-invitations"
      >
        <li
          v-for="invitation in pending"
          :key="invitation.id"
          class="flex items-center justify-between gap-3 py-3"
        >
          <div class="flex flex-col">
            <span class="font-semibold">{{ invitation.invitee.name }}</span>
            <span class="text-sm text-muted-foreground">
              {{ roleLabel(invitation.kind, invitation.isExclusive) }} · vale até {{ formatDayMonth(invitation.expiresAt) }}
            </span>
          </div>
          <button
            type="button"
            class="h-11 shrink-0 rounded-md border border-input px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            :aria-label="`Cancelar convite de ${invitation.invitee.name}`"
            :disabled="cancel.isPending.value"
            @click="cancelInvitation(invitation.id)"
          >
            Cancelar
          </button>
        </li>
      </ul>
    </div>
    <!-- Fora da lista: se o convite sumir (já recusado, expirado), a mensagem continua. -->
    <p
      v-if="cancelError"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ cancelError }}
    </p>
  </section>
</template>
