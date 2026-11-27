/** Duração da sessão (spec 001, Restrições): 7 dias, sem renovação automática. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function sessionExpiresAt(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_MS)
}

/** R3: sessão expirada equivale a não autenticado. */
export function isSessionActive(session: { expiresAt: Date }, now: Date): boolean {
  return session.expiresAt.getTime() > now.getTime()
}
