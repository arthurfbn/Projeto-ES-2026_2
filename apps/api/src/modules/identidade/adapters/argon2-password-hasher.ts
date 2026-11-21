import { hash, verify } from '@node-rs/argon2'
import type { PasswordHasher } from '../app/ports'

/** argon2id com os parâmetros padrão da biblioteca (recomendação OWASP; ADR-0006). */
export function createArgon2PasswordHasher(): PasswordHasher {
  return {
    hash: (password) => hash(password),
    async verify(passwordHash, password) {
      try {
        return await verify(passwordHash, password)
      } catch {
        return false
      }
    },
  }
}
