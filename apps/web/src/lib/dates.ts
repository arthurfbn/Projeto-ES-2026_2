const dayMonth = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })

/** Dia e mês no fuso de São Paulo (ex.: "28/11"), a partir de um instante ISO em UTC. */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso))
}

const isoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Hoje no calendário de São Paulo, no formato AAAA-MM-DD (o mesmo das vigências). */
export function todaySaoPaulo(now: Date = new Date()): string {
  return isoDay.format(now)
}

/** "2026-11-30" → "30/11/2026" (data de calendário, sem fuso a converter). */
export function formatIsoDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

/** Hora no fuso de São Paulo (ex.: "10:00"), a partir de um instante ISO em UTC. */
export function formatTime(iso: string): string {
  return time.format(new Date(iso))
}

const weekdayShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/**
 * Os próximos `count` dias do calendário a partir de `start` (AAAA-MM-DD), com rótulo curto
 * ("seg 30/11"). Datas de calendário: a conta é feita em UTC, sem fuso a converter.
 */
export function nextDays(start: string, count: number): { date: string; label: string }[] {
  const first = new Date(`${start}T12:00:00Z`)
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(first.getTime() + i * 24 * 60 * 60 * 1000)
    const date = day.toISOString().slice(0, 10)
    const [, month, dayOfMonth] = date.split('-')
    return { date, label: `${weekdayShort[day.getUTCDay()]} ${dayOfMonth}/${month}` }
  })
}
