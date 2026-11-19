/** Porta de relógio: o core recebe o horário por parâmetro, e os casos de uso o obtêm daqui. */
export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  now: () => new Date(),
}

export function fixedClock(at: Date | string): Clock {
  const date = typeof at === 'string' ? new Date(at) : at
  return { now: () => new Date(date) }
}
