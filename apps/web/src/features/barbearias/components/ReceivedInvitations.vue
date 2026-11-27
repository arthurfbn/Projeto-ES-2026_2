<script setup lang="ts">
import { computed, ref } from 'vue'
import { leaveConfirmationErrorSchema, type ReceivedInvitation } from '@shavey/contracts'
import { useMe } from '@/features/conta/queries'
import { formErrorsFrom } from '@/features/conta/form-errors'
import { formatDayMonth } from '@/lib/dates'
import { ApiError } from '@/lib/http'
import { useAcceptInvitation, useDeclineInvitation, useReceivedInvitations } from '../queries'

const { data: me } = useMe()
const { data: invitations, isError, refetch } = useReceivedInvitations(computed(() => Boolean(me.value)))
const accept = useAcceptInvitation()
const decline = useDeclineInvitation()

const errorMessage = ref<string | null>(null)
const doneMessage = ref<string | null>(null)
/** R14c: convite exclusivo esperando o barbeiro confirmar de quais barbearias sai. */
const leaving = ref<{ invitationId: string; barbershops: string[] } | null>(null)

const busy = computed(() => accept.isPending.value || decline.isPending.value)

function describe(invitation: ReceivedInvitation): string {
  if (invitation.kind === 'manager') return 'Gerente'
  return invitation.isExclusive ? 'Barbeiro · vínculo exclusivo' : 'Barbeiro'
}

/** "A", "A e B", "A, B e C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

function reset() {
  errorMessage.value = null
  doneMessage.value = null
}

function showError(error: unknown, fallback: string) {
  errorMessage.value = formErrorsFrom(error).general ?? fallback
  // Expirado ou já respondido: a lista é recarregada e o convite some.
  if (error instanceof ApiError && error.status === 409) void refetch()
}

/** Aceitar fica no Início: o cartão novo aparece no carrossel certo (ADR-0022). */
async function acceptInvitation(invitation: ReceivedInvitation, confirmLeave = false) {
  reset()
  try {
    const accepted = await accept.mutateAsync({ invitationId: invitation.id, confirmLeave })
    leaving.value = null
    const where = accepted.kind === 'manager' ? 'Minhas barbearias' : 'Meus vínculos'
    doneMessage.value = `Convite aceito. ${invitation.barbershopName} já está em ${where}.`
  } catch (error) {
    const confirmation = error instanceof ApiError ? leaveConfirmationErrorSchema.safeParse(error.body) : null
    if (confirmation?.success) {
      leaving.value = { invitationId: invitation.id, barbershops: confirmation.data.barbershops.map((shop) => shop.name) }
      return
    }
    leaving.value = null
    showError(error, 'Não foi possível aceitar o convite. Tente de novo.')
  }
}

async function declineInvitation(invitation: ReceivedInvitation) {
  reset()
  leaving.value = null
  try {
    await decline.mutateAsync(invitation.id)
    doneMessage.value = `Convite de ${invitation.barbershopName} recusado.`
  } catch (error) {
    showError(error, 'Não foi possível recusar o convite. Tente de novo.')
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
        class="flex flex-col gap-3 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col">
            <span class="font-semibold">{{ invitation.barbershopName }}</span>
            <span class="text-sm text-muted-foreground">
              {{ describe(invitation) }} · vale até {{ formatDayMonth(invitation.expiresAt) }}
            </span>
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="h-11 rounded-md border border-input px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              :aria-label="`Recusar convite de ${invitation.barbershopName}`"
              :disabled="busy"
              @click="declineInvitation(invitation)"
            >
              Recusar
            </button>
            <button
              type="button"
              class="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              :aria-label="`Aceitar convite de ${invitation.barbershopName}`"
              :disabled="busy"
              @click="acceptInvitation(invitation)"
            >
              Aceitar
            </button>
          </div>
        </div>

        <div
          v-if="leaving?.invitationId === invitation.id"
          role="alertdialog"
          aria-labelledby="leave-title"
          aria-describedby="leave-text"
          class="flex flex-col gap-3 rounded-lg border border-input bg-muted p-4"
          data-testid="leave-confirmation"
        >
          <p
            id="leave-title"
            class="font-semibold"
          >
            Este vínculo é exclusivo.
          </p>
          <p id="leave-text">
            Para aceitar, você sai de {{ joinNames(leaving.barbershops) }}: seus vínculos lá ficam inativos.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              :disabled="busy"
              @click="acceptInvitation(invitation, true)"
            >
              Sair e aceitar
            </button>
            <button
              type="button"
              class="h-11 rounded-md border border-input bg-card px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              @click="leaving = null"
            >
              Agora não
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
  <!-- Fora da seção: se o convite sumir da lista (expirado, já respondido), a mensagem continua. -->
  <p
    v-if="errorMessage"
    role="alert"
    class="rounded-xl border bg-card p-4 text-sm font-semibold text-destructive"
  >
    {{ errorMessage }}
  </p>
  <p
    v-if="doneMessage"
    role="status"
    class="rounded-xl border bg-card p-4 font-semibold"
  >
    {{ doneMessage }}
  </p>
</template>
