import { createHash, randomBytes } from 'node:crypto'
import { fail, ok, type Result } from '../../../shared/result'
import { isSessionActive, sessionExpiresAt } from '../core/session'
import type { IdentityPorts, UserRecord } from './ports'

/** Dados públicos do usuário (nunca o hash da senha). */
export type AuthUser = Pick<UserRecord, 'id' | 'name' | 'email' | 'phone'>

export type SessionStart = { user: AuthUser; token: string; expiresAt: Date }

const toAuthUser = ({ id, name, email, phone }: UserRecord): AuthUser => ({ id, name, email, phone })

/** O cookie leva o token; o banco guarda só o hash, para um vazamento do banco não entregar sessões. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

async function startSession(ports: IdentityPorts, user: UserRecord): Promise<SessionStart> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = sessionExpiresAt(ports.clock.now())
  await ports.sessions.create({ tokenHash: hashToken(token), userId: user.id, expiresAt })
  return { user: toAuthUser(user), token, expiresAt }
}

/** R1, R2: todo usuário nasce só cliente; e-mail já vem normalizado do contrato. */
export async function signUp(
  ports: IdentityPorts,
  input: { name: string; email: string; phone: string; password: string },
): Promise<Result<SessionStart, 'EMAIL_TAKEN'>> {
  if (await ports.users.findByEmail(input.email)) return fail('EMAIL_TAKEN')

  const created = await ports.users.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await ports.hasher.hash(input.password),
  })
  if (!created.ok) return created
  return ok(await startSession(ports, created.value))
}

// Hash de referência para e-mail inexistente: o login leva o mesmo tempo com ou sem conta (R4).
let dummyHash: Promise<string> | undefined

/** R3, R4: mesma resposta para e-mail inexistente e senha errada; sessão nova a cada login. */
export async function logIn(
  ports: IdentityPorts,
  input: { email: string; password: string; previousToken?: string },
): Promise<Result<SessionStart, 'INVALID_CREDENTIALS'>> {
  const user = await ports.users.findByEmail(input.email)
  if (!user) {
    dummyHash ??= ports.hasher.hash('senha-de-referencia')
    await ports.hasher.verify(await dummyHash, input.password)
    return fail('INVALID_CREDENTIALS')
  }
  if (!(await ports.hasher.verify(user.passwordHash, input.password))) return fail('INVALID_CREDENTIALS')

  if (input.previousToken) await ports.sessions.deleteByTokenHash(hashToken(input.previousToken))
  return ok(await startSession(ports, user))
}

export async function logOut(ports: IdentityPorts, token: string): Promise<void> {
  await ports.sessions.deleteByTokenHash(hashToken(token))
}

/** Usuário dono do token, ou null se a sessão não existe ou expirou (e então é apagada). */
export async function currentUser(ports: IdentityPorts, token: string): Promise<AuthUser | null> {
  const tokenHash = hashToken(token)
  const session = await ports.sessions.findByTokenHash(tokenHash)
  if (!session) return null
  if (!isSessionActive(session, ports.clock.now())) {
    await ports.sessions.deleteByTokenHash(tokenHash)
    return null
  }
  const user = await ports.users.findById(session.userId)
  return user ? toAuthUser(user) : null
}
