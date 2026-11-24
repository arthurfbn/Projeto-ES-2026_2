import type { MeResponse } from '@shavey/contracts'
import type { Result } from '../../../shared/result'
import type { Clock } from '../../../shared/clock'

export type UserRecord = {
  id: string
  name: string
  email: string
  phone: string
  passwordHash: string
}

export type NewUser = Omit<UserRecord, 'id'>

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>
  findById(id: string): Promise<UserRecord | null>
  /** Traduz a violação de unicidade do e-mail (corrida entre dois cadastros) em erro de domínio. */
  create(user: NewUser): Promise<Result<UserRecord, 'EMAIL_TAKEN'>>
}

export type SessionRecord = { userId: string; expiresAt: Date }

export interface SessionRepository {
  create(session: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void>
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>
  deleteByTokenHash(tokenHash: string): Promise<void>
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
}

/**
 * Barbearias que o usuário gerencia e seus vínculos ativos (R5; ADR-0022). Quem sabe responder é
 * o módulo barbearias; a identidade só conhece esta porta (ADR-0003).
 */
export interface BarbershopProfilesQuery {
  listForUser(userId: string): Promise<Omit<MeResponse, 'user'>>
}

export type IdentityPorts = {
  users: UserRepository
  sessions: SessionRepository
  hasher: PasswordHasher
  profiles: BarbershopProfilesQuery
  clock: Clock
}
