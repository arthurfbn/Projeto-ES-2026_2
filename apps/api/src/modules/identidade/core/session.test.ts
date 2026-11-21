import { describe, expect, it } from 'vitest'
import { isSessionActive, sessionExpiresAt } from './session'

const now = new Date('2026-11-21T10:00:00-03:00')

describe('sessão', () => {
  it('expira 7 dias depois de criada', () => {
    expect(sessionExpiresAt(now)).toEqual(new Date('2026-11-28T10:00:00-03:00'))
  })

  it('está ativa antes de expirar', () => {
    expect(isSessionActive({ expiresAt: new Date('2026-11-21T10:00:01-03:00') }, now)).toBe(true)
  })

  it('expirada (no instante exato ou depois) conta como não autenticada', () => {
    expect(isSessionActive({ expiresAt: now }, now)).toBe(false)
    expect(isSessionActive({ expiresAt: new Date('2026-11-20T10:00:00-03:00') }, now)).toBe(false)
  })
})
