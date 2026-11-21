import { describe, expect, it } from 'vitest'
import { checkReactivation, planShiftChange, type WeeklyWindow } from './allowed-shift'

const h = (hours: number, minutes = 0) => hours * 60 + minutes
const win = (weekday: number, start: number, end: number): WeeklyWindow => ({
  weekday,
  startMinute: start,
  endMinute: end,
})

/** Seg–sáb 09:00–18:00 (seg = 1, sáb = 6). */
const segASab = [1, 2, 3, 4, 5, 6].map((day) => win(day, h(9), h(18)))

describe('planShiftChange (R15, R21)', () => {
  it('CA14: aceita seg–sáb 09:00–18:00, ordenado por dia', () => {
    const result = planShiftChange({ windows: [...segASab].reverse(), availability: [] })
    expect(result).toEqual({ ok: true, value: segASab })
  })

  it('turno vazio é válido: vínculo sem turno', () => {
    expect(planShiftChange({ windows: [], availability: [win(0, h(7), h(22))] })).toEqual({ ok: true, value: [] })
  })

  it('aceita duas janelas no mesmo dia sem sobreposição (ex.: com almoço)', () => {
    const windows = [win(1, h(14), h(18)), win(1, h(9), h(12))]
    expect(planShiftChange({ windows, availability: [] })).toEqual({
      ok: true,
      value: [win(1, h(9), h(12)), win(1, h(14), h(18))],
    })
  })

  it('aceita janela que termina à meia-noite', () => {
    expect(planShiftChange({ windows: [win(5, h(18), h(24))], availability: [] }).ok).toBe(true)
  })

  it.each([
    ['início depois do fim', win(1, h(18), h(9))],
    ['início igual ao fim', win(1, h(9), h(9))],
    ['fora do passo de 15 min', win(1, h(9, 10), h(18))],
    ['passando da meia-noite', win(1, h(20), h(24, 15))],
    ['minuto negativo', win(1, -15, h(9))],
    ['dia da semana inexistente', win(7, h(9), h(18))],
  ])('recusa janela com %s', (_caso, window) => {
    expect(planShiftChange({ windows: [window], availability: [] })).toEqual({ ok: false, error: 'INVALID_WINDOW' })
  })

  it('recusa janelas que se sobrepõem no mesmo dia', () => {
    const windows = [win(1, h(9), h(13)), win(1, h(12), h(18))]
    expect(planShiftChange({ windows, availability: [] })).toEqual({ ok: false, error: 'OVERLAPPING_WINDOWS' })
  })

  it('janelas encostadas (uma termina quando a outra começa) não se sobrepõem', () => {
    const windows = [win(1, h(9), h(12)), win(1, h(12), h(18))]
    expect(planShiftChange({ windows, availability: [] }).ok).toBe(true)
  })

  it('CA18: recusa turno que deixaria disponibilidade de fora', () => {
    const result = planShiftChange({ windows: [win(1, h(9), h(15))], availability: [win(1, h(16), h(18))] })
    expect(result).toEqual({ ok: false, error: 'AVAILABILITY_OUTSIDE_SHIFT' })
  })

  it('CA18: recusa quando a disponibilidade sai só em parte da janela', () => {
    const result = planShiftChange({ windows: [win(1, h(9), h(17))], availability: [win(1, h(16), h(18))] })
    expect(result).toEqual({ ok: false, error: 'AVAILABILITY_OUTSIDE_SHIFT' })
  })

  it('recusa quando o novo turno não tem o dia de uma disponibilidade', () => {
    const result = planShiftChange({ windows: [win(1, h(9), h(18))], availability: [win(2, h(10), h(12))] })
    expect(result).toEqual({ ok: false, error: 'AVAILABILITY_OUTSIDE_SHIFT' })
  })

  it('aceita turno em que toda disponibilidade cabe numa janela do mesmo dia', () => {
    const availability = [win(1, h(10), h(12)), win(6, h(9), h(18))]
    expect(planShiftChange({ windows: segASab, availability }).ok).toBe(true)
  })
})

describe('checkReactivation (exclusividade)', () => {
  it('reativa vínculo quando não há conflito', () => {
    expect(
      checkReactivation({ isExclusive: false, hasActiveExclusiveElsewhere: false, hasActiveMembershipElsewhere: true }),
    ).toEqual({ ok: true, value: undefined })
  })

  it('não reativa se o barbeiro tem vínculo exclusivo ativo em outra barbearia', () => {
    expect(
      checkReactivation({ isExclusive: false, hasActiveExclusiveElsewhere: true, hasActiveMembershipElsewhere: true }),
    ).toEqual({ ok: false, error: 'EXCLUSIVITY_CONFLICT' })
  })

  it('não reativa vínculo exclusivo se o barbeiro tem vínculo ativo em outra barbearia', () => {
    expect(
      checkReactivation({ isExclusive: true, hasActiveExclusiveElsewhere: false, hasActiveMembershipElsewhere: true }),
    ).toEqual({ ok: false, error: 'EXCLUSIVITY_CONFLICT' })
  })
})
