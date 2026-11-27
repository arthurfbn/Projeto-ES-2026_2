import { describe, expect, it } from 'vitest'
import { planAvailability, saoPauloDate, type ExistingAvailability } from './availability'

const h = (hours: number, minutes = 0) => hours * 60 + minutes
const segunda = (start: number, end: number) => ({ weekday: 1, startMinute: start, endMinute: end })

const turnoSeg9as18 = [segunda(h(9), h(18))]
const active = { isActive: true, shift: turnoSeg9as18 }
const semTurno = { isActive: true, shift: [] }

const desde = (validFrom: string, validUntil: string | null = null) => ({ validFrom, validUntil })

function plan(input: Partial<Parameters<typeof planAvailability>[0]> = {}) {
  return planAvailability({
    window: segunda(h(10), h(12)),
    validity: desde('2026-11-30'),
    membership: active,
    existing: [],
    ...input,
  })
}

const naA = (start: number, end: number, validity = desde('2026-11-30')): ExistingAvailability => ({
  ...segunda(start, end),
  ...validity,
})

describe('planAvailability (R17–R20)', () => {
  it('CA16: com turno seg 09:00–18:00, seg 10:00–12:00 salva', () => {
    expect(plan()).toEqual({
      ok: true,
      value: { weekday: 1, startMinute: h(10), endMinute: h(12), validFrom: '2026-11-30', validUntil: null },
    })
  })

  it('CA16: com turno seg 09:00–18:00, seg 17:00–19:00 dá "fora do turno"', () => {
    expect(plan({ window: segunda(h(17), h(19)) })).toEqual({ ok: false, error: 'OUTSIDE_SHIFT' })
  })

  it('R19: dia sem janela no turno também é "fora do turno"', () => {
    expect(plan({ window: { weekday: 0, startMinute: h(10), endMinute: h(12) } })).toEqual({
      ok: false,
      error: 'OUTSIDE_SHIFT',
    })
  })

  it('CA16b: sem turno, dom 07:00–22:00 salva', () => {
    const window = { weekday: 0, startMinute: h(7), endMinute: h(22) }
    expect(plan({ window, membership: semTurno }).ok).toBe(true)
  })

  it.each([
    ['fora do passo de 15 min', segunda(h(10, 10), h(12))],
    ['início igual ao fim', segunda(h(10), h(10))],
    ['início depois do fim', segunda(h(12), h(10))],
    ['passando da meia-noite', segunda(h(23), h(24, 15))],
  ])('R18: recusa janela com %s', (_caso, window) => {
    expect(plan({ window, membership: semTurno })).toEqual({ ok: false, error: 'INVALID_WINDOW' })
  })

  it('R17: vigência com fim antes do início é recusada', () => {
    expect(plan({ validity: desde('2026-12-10', '2026-12-01') })).toEqual({ ok: false, error: 'INVALID_VALIDITY' })
  })

  it('R17: vigência com fim igual ao início vale um dia', () => {
    expect(plan({ validity: desde('2026-12-07', '2026-12-07') }).ok).toBe(true)
  })

  it('R17: só barbeiro com vínculo ativo define disponibilidade', () => {
    expect(plan({ membership: { ...active, isActive: false } })).toEqual({ ok: false, error: 'MEMBERSHIP_INACTIVE' })
  })

  it('CA17: seg 11:00–13:00 sobre seg 10:00–12:00 já existente (qualquer barbearia) é sobreposição', () => {
    const result = plan({ window: segunda(h(11), h(13)), membership: semTurno, existing: [naA(h(10), h(12))] })
    expect(result).toEqual({ ok: false, error: 'OVERLAPPING_AVAILABILITY' })
  })

  it('R20: janelas encostadas (12:00 termina, 12:00 começa) não se sobrepõem', () => {
    const result = plan({ window: segunda(h(12), h(14)), membership: semTurno, existing: [naA(h(10), h(12))] })
    expect(result.ok).toBe(true)
  })

  it('R20: mesmo horário em outro dia da semana não se sobrepõe', () => {
    const result = plan({
      window: { weekday: 2, startMinute: h(10), endMinute: h(12) },
      membership: semTurno,
      existing: [naA(h(10), h(12))],
    })
    expect(result.ok).toBe(true)
  })

  it('R20: vigências que não se cruzam não se sobrepõem', () => {
    const result = plan({
      validity: desde('2027-01-01'),
      existing: [naA(h(10), h(12), desde('2026-11-30', '2026-12-31'))],
    })
    expect(result.ok).toBe(true)
  })

  it('R20: vigência sem fim cruza com qualquer vigência posterior', () => {
    const result = plan({
      validity: desde('2027-06-01', '2027-06-30'),
      existing: [naA(h(10), h(12), desde('2026-11-30'))],
    })
    expect(result).toEqual({ ok: false, error: 'OVERLAPPING_AVAILABILITY' })
  })

  it('R20: vigência que termina no dia em que a outra começa se cruza (datas inclusivas)', () => {
    const result = plan({
      validity: desde('2026-12-31'),
      existing: [naA(h(10), h(12), desde('2026-11-30', '2026-12-31'))],
    })
    expect(result).toEqual({ ok: false, error: 'OVERLAPPING_AVAILABILITY' })
  })
})

describe('saoPauloDate', () => {
  it('usa o calendário de São Paulo (UTC−3), não o UTC', () => {
    expect(saoPauloDate(new Date('2026-11-25T23:30:00-03:00'))).toBe('2026-11-25')
    expect(saoPauloDate(new Date('2026-11-26T01:30:00Z'))).toBe('2026-11-25')
    expect(saoPauloDate(new Date('2026-11-26T03:00:00Z'))).toBe('2026-11-26')
  })
})
