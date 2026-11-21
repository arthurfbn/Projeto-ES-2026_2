import type { WeeklyWindow } from '@shavey/contracts'

/** Abreviações dos dias (0 = domingo … 6 = sábado), como no contrato. */
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

/** 540 → "09:00". Janelas são hora de relógio em São Paulo, sem fuso a converter. */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "09:00" → 540; texto que não é HH:MM (até 24:00) vira NaN. */
export function timeToMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return Number.NaN
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return Number(match[2]) < 60 && minutes <= 24 * 60 ? minutes : Number.NaN
}

function dayLabel(days: number[]): string {
  const first = days[0] ?? 0
  const last = days[days.length - 1] ?? first
  if (days.length === 1) return WEEKDAY_SHORT[first] ?? ''
  if (days.length === 2) return `${WEEKDAY_SHORT[first]}, ${WEEKDAY_SHORT[last]}`
  return `${WEEKDAY_SHORT[first]}–${WEEKDAY_SHORT[last]}`
}

/** Turno em linhas legíveis: dias seguidos com os mesmos horários viram uma faixa ("Seg–Sáb 09:00–18:00"). */
export function summarizeWindows(windows: readonly WeeklyWindow[]): string[] {
  const hoursByDay = new Map<number, string>()
  for (const window of [...windows].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)) {
    const range = `${minutesToTime(window.startMinute)}–${minutesToTime(window.endMinute)}`
    const current = hoursByDay.get(window.weekday)
    hoursByDay.set(window.weekday, current ? `${current}, ${range}` : range)
  }

  const groups: Array<{ days: number[]; hours: string }> = []
  for (const [day, hours] of hoursByDay) {
    const last = groups[groups.length - 1]
    const lastDay = last?.days[last.days.length - 1]
    if (last && last.hours === hours && lastDay === day - 1) last.days.push(day)
    else groups.push({ days: [day], hours })
  }
  return groups.map((group) => `${dayLabel(group.days)} ${group.hours}`)
}
