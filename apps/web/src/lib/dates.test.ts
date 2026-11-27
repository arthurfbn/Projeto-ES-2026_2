import { describe, expect, it } from 'vitest'
import { formatTime, nextDays } from './dates'

describe('datas da agenda', () => {
  it('mostra a hora de São Paulo', () => {
    expect(formatTime('2026-11-30T13:00:00.000Z')).toBe('10:00')
  })

  it('lista os próximos dias com rótulo curto, virando o mês', () => {
    expect(nextDays('2026-11-29', 3)).toEqual([
      { date: '2026-11-29', label: 'dom 29/11' },
      { date: '2026-11-30', label: 'seg 30/11' },
      { date: '2026-12-01', label: 'ter 01/12' },
    ])
  })
})
