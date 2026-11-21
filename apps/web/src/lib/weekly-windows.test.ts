import { describe, expect, it } from 'vitest'
import { minutesToTime, summarizeWindows, timeToMinutes } from './weekly-windows'

const h = (hours: number, minutes = 0) => hours * 60 + minutes
const win = (weekday: number, start: number, end: number) => ({ weekday, startMinute: start, endMinute: end })

describe('horário do dia', () => {
  it.each([
    [0, '00:00'],
    [h(9), '09:00'],
    [h(17, 45), '17:45'],
    [h(24), '24:00'],
  ])('%i minutos = %s', (minutes, time) => {
    expect(minutesToTime(minutes)).toBe(time)
    expect(timeToMinutes(time)).toBe(minutes)
  })

  it.each(['', '9h', '25:00', '09:60'])('"%s" não é horário (NaN)', (time) => {
    expect(timeToMinutes(time)).toBeNaN()
  })
})

describe('resumo do turno', () => {
  it('sem janelas = sem turno', () => {
    expect(summarizeWindows([])).toEqual([])
  })

  it('CA14: agrupa dias seguidos com o mesmo horário', () => {
    const segASab = [1, 2, 3, 4, 5, 6].map((day) => win(day, h(9), h(18)))
    expect(summarizeWindows(segASab)).toEqual(['Seg–Sáb 09:00–18:00'])
  })

  it('separa horários diferentes e dias soltos, e junta janelas do mesmo dia', () => {
    const windows = [
      win(1, h(9), h(12)),
      win(1, h(14), h(18)),
      win(3, h(9), h(18)),
      win(5, h(9), h(18)),
      win(6, h(8), h(12)),
    ]
    expect(summarizeWindows(windows)).toEqual(['Seg 09:00–12:00, 14:00–18:00', 'Qua 09:00–18:00', 'Sex 09:00–18:00', 'Sáb 08:00–12:00'])
  })

  it('dois dias seguidos viram faixa com vírgula, não com traço', () => {
    expect(summarizeWindows([win(5, h(9), h(18)), win(6, h(9), h(18))])).toEqual(['Sex, Sáb 09:00–18:00'])
  })
})
