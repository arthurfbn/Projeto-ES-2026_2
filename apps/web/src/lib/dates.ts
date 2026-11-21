const dayMonth = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })

/** Dia e mês no fuso de São Paulo (ex.: "28/11"), a partir de um instante ISO em UTC. */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso))
}
