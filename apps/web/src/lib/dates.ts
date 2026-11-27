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
