<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReceivedInvitation } from '@shavey/contracts'
import { useMe } from '@/features/conta/queries'
import { formatDayMonth } from '@/lib/dates'
import { formErrorsFrom } from '@/features/conta/form-errors'
import { useAcceptInvitation, useReceivedInvitations } from '../queries'

const { data: me } = useMe()
const { data: invitations, isError, refetch } = useReceivedInvitations(computed(() => Boolean(me.value)))
const accept = useAcceptInvitation()
const acceptError = ref<string | null>(null)
const acceptedMessage = ref<string | null>(null)

function describe(invitation: ReceivedInvitation): string {
  if (invitation.kind === 'manager') return 'Gerente'
  return invitation.isExclusive ? 'Barbeiro · vínculo exclusivo' : 'Barbeiro'
}

/** Aceitar fica no Início: o cartão novo aparece no carrossel certo (ADR-0022). */
async function acceptInvitation(invitation: ReceivedInvitation) {
  acceptError.value = null
  acceptedMessage.value = null
  try {
    const accepted = await accept.mutateAsync(invitation.id)
    const where = accepted.kind === 'manager' ? 'Minhas barbearias' : 'Meus vínculos'
    acceptedMessage.value = `Convite aceito. ${invitation.barbershopName} já está em ${where}.`
  } catch (error) {
    acceptError.value = formErrorsFrom(error).general ?? 'Não foi possível aceitar o convite. Tente de novo.'
  }
}
</script>

<template>
  <!-- Só aparece com sessão e quando há algo a mostrar (ADR-0018: o convidado vê os pendentes ao entrar). -->
  <section
    v-if="me && (isError || invitations?.length)"
    class="flex flex-col gap-4 rounded-xl border bg-card p-5"
    aria-labelledby="invitations-title"
  >
    <h2
      id="invitations-title"
      class="font-display text-2xl font-extrabold"
    >
      Convites
    </h2>

    <div
      v-if="isError"
      class="flex flex-col gap-3"
    >
      <p>Não foi possível carregar seus convites.</p>
      <button
        type="button"
        class="h-11 self-start rounded-md border px-4 font-semibold"
        @click="refetch()"
      >
        Tentar de novo
      </button>
    </div>

    <ul
      v-else
      class="flex flex-col divide-y divide-border"
      data-testid="invitation-list"
    >
      <li
        v-for="invitation in invitations"
        :key="invitation.id"
        class="flex items-center justify-between gap-3 py-3"
      >
        <div class="flex flex-col">
          <span class="font-semibold">{{ invitation.barbershopName }}</span>
          <span class="text-sm text-muted-foreground">
            {{ describe(invitation) }} · vale até {{ formatDayMonth(invitation.expiresAt) }}
          </span>
        </div>
        <button
          type="button"
          class="h-11 shrink-0 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          :aria-label="`Aceitar convite de ${invitation.barbershopName}`"
          :disabled="accept.isPending.value"
          @click="acceptInvitation(invitation)"
        >
          Aceitar
        </button>
      </li>
    </ul>

    <p
      v-if="acceptError"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ acceptError }}
    </p>
  </section>
  <p
    v-if="acceptedMessage"
    role="status"
    class="rounded-xl border bg-card p-4 font-semibold"
  >
    {{ acceptedMessage }}
  </p>
</template>
