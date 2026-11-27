import { fail, ok, type Result } from '../../../shared/result'
import { fitsIn, isValidWindow, type WeeklyWindow } from './allowed-shift'

/**
 * Vigência de uma disponibilidade: datas do calendário de São Paulo (AAAA-MM-DD), inclusivas.
 * Sem fim = vale daqui em diante.
 */
export type Validity = { validFrom: string; validUntil: string | null }

export type NewAvailability = WeeklyWindow & Validity

/** Disponibilidade já cadastrada do mesmo barbeiro, em qualquer barbearia (R20). */
export type ExistingAvailability = WeeklyWindow & Validity

export type AvailabilityError =
  | 'MEMBERSHIP_INACTIVE'
  | 'INVALID_WINDOW'
  | 'INVALID_VALIDITY'
  | 'OUTSIDE_SHIFT'
  | 'OVERLAPPING_AVAILABILITY'

/** Datas AAAA-MM-DD comparam como texto; sem fim é o mais distante possível. */
const END_OF_TIME = '9999-12-31'

function validityCrosses(a: Validity, b: Validity): boolean {
  return a.validFrom <= (b.validUntil ?? END_OF_TIME) && b.validFrom <= (a.validUntil ?? END_OF_TIME)
}

function overlaps(a: NewAvailability, b: ExistingAvailability): boolean {
  return (
    a.weekday === b.weekday &&
    a.startMinute < b.endMinute &&
    b.startMinute < a.endMinute &&
    validityCrosses(a, b)
  )
}

/**
 * R17–R20: o barbeiro, com vínculo ativo, cadastra uma janela semanal com vigência.
 * Com turno, a janela cabe inteira numa janela do turno do mesmo dia (sem turno, vale qualquer
 * janela; ADR-0019). Não pode sobrepor outra janela dele, em qualquer barbearia, em vigências
 * que se cruzam.
 */
export function planAvailability(input: {
  window: WeeklyWindow
  validity: Validity
  membership: { isActive: boolean; shift: WeeklyWindow[] }
  existing: ExistingAvailability[]
}): Result<NewAvailability, AvailabilityError> {
  const { window, validity, membership, existing } = input
  if (!membership.isActive) return fail('MEMBERSHIP_INACTIVE')
  if (!isValidWindow(window)) return fail('INVALID_WINDOW')
  if (validity.validUntil !== null && validity.validUntil < validity.validFrom) return fail('INVALID_VALIDITY')

  if (membership.shift.length > 0 && !membership.shift.some((shiftWindow) => fitsIn(window, shiftWindow))) {
    return fail('OUTSIDE_SHIFT')
  }

  const candidate: NewAvailability = { ...window, ...validity }
  if (existing.some((other) => overlaps(candidate, other))) return fail('OVERLAPPING_AVAILABILITY')
  return ok(candidate)
}

const saoPauloDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data do calendário de São Paulo (AAAA-MM-DD) de um instante. */
export function saoPauloDate(instant: Date): string {
  return saoPauloDay.format(instant)
}
