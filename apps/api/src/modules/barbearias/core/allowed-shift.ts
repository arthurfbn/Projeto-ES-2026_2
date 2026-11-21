import { fail, ok, type Result } from '../../../shared/result'

/**
 * Janela semanal: dia da semana (0 = domingo … 6 = sábado) e minutos do dia, hora de relógio
 * (America/Sao_Paulo), sem data. Serve ao turno permitido e à disponibilidade semanal.
 */
export type WeeklyWindow = { weekday: number; startMinute: number; endMinute: number }

const STEP_MINUTES = 15
const MINUTES_IN_DAY = 24 * 60

/** Início < fim, no mesmo dia (fim pode ser 24:00), de 15 em 15 minutos. */
function isValidWindow({ weekday, startMinute, endMinute }: WeeklyWindow): boolean {
  const onStep = (minute: number) => Number.isInteger(minute) && minute % STEP_MINUTES === 0
  return (
    Number.isInteger(weekday) &&
    weekday >= 0 &&
    weekday <= 6 &&
    onStep(startMinute) &&
    onStep(endMinute) &&
    startMinute >= 0 &&
    endMinute <= MINUTES_IN_DAY &&
    startMinute < endMinute
  )
}

const byDayAndStart = (a: WeeklyWindow, b: WeeklyWindow) => a.weekday - b.weekday || a.startMinute - b.startMinute

function hasOverlap(sorted: WeeklyWindow[]): boolean {
  return sorted.some((window, i) => {
    const previous = sorted[i - 1]
    return previous !== undefined && previous.weekday === window.weekday && window.startMinute < previous.endMinute
  })
}

const fitsIn = (inner: WeeklyWindow, outer: WeeklyWindow) =>
  inner.weekday === outer.weekday && inner.startMinute >= outer.startMinute && inner.endMinute <= outer.endMinute

/**
 * R15, R21: valida o novo turno do vínculo (vazio = sem turno). Com turno, cada janela de
 * disponibilidade existente precisa caber inteira numa janela do turno do mesmo dia; senão a
 * mudança é recusada e vale o turno atual (a proposta ao barbeiro é da semana 3, ADR-0019).
 */
export function planShiftChange(input: {
  windows: WeeklyWindow[]
  availability: WeeklyWindow[]
}): Result<WeeklyWindow[], 'INVALID_WINDOW' | 'OVERLAPPING_WINDOWS' | 'AVAILABILITY_OUTSIDE_SHIFT'> {
  if (!input.windows.every(isValidWindow)) return fail('INVALID_WINDOW')

  const windows = [...input.windows].sort(byDayAndStart)
  if (hasOverlap(windows)) return fail('OVERLAPPING_WINDOWS')
  if (windows.length === 0) return ok(windows)

  const allInside = input.availability.every((slot) => windows.some((window) => fitsIn(slot, window)))
  if (!allInside) return fail('AVAILABILITY_OUTSIDE_SHIFT')
  return ok(windows)
}

/**
 * Exclusividade (CONTEXT.md): com vínculo exclusivo ativo, o barbeiro não tem outro vínculo ativo.
 * Reativar um vínculo não pode quebrar isso, em nenhum dos dois sentidos.
 */
export function checkReactivation(input: {
  isExclusive: boolean
  hasActiveExclusiveElsewhere: boolean
  hasActiveMembershipElsewhere: boolean
}): Result<void, 'EXCLUSIVITY_CONFLICT'> {
  if (input.hasActiveExclusiveElsewhere) return fail('EXCLUSIVITY_CONFLICT')
  if (input.isExclusive && input.hasActiveMembershipElsewhere) return fail('EXCLUSIVITY_CONFLICT')
  return ok(undefined)
}
