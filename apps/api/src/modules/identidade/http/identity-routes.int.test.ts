import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { apiErrorSchema, meResponseSchema } from '@shavey/contracts'
import { buildApp } from '../../../app'
import type { Clock } from '../../../shared/clock'
import { createDb } from '../../../shared/db/prisma'
import { createIdentityModule, SESSION_COOKIE } from '../index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória nos testes de integração')
const db = createDb(databaseUrl)

// Relógio controlável: permite simular a expiração da sessão.
let now = new Date('2026-11-21T10:00:00-03:00')
const clock: Clock = { now: () => new Date(now) }

async function makeApp(authRateLimit = { max: 1000, timeWindow: '1 minute' }) {
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    // Sem barbearias aqui: o que o Início mostra é testado no módulo barbearias.
    modules: [
      createIdentityModule({
        db,
        clock,
        authRateLimit,
        profiles: { listForUser: async () => ({ managedBarbershops: [], memberships: [] }) },
      }),
    ],
  })
}

const ana = { name: 'Ana Souza', email: 'ana@exemplo.com', phone: '(11) 98765-4321', password: 'segredo123' }

type App = Awaited<ReturnType<typeof makeApp>>

async function signup(app: App, body: Record<string, unknown> = ana) {
  return app.inject({ method: 'POST', url: '/auth/signup', payload: body })
}

function sessionCookie(response: { cookies: Array<{ name: string; value: string }> }) {
  return response.cookies.find((c) => c.name === SESSION_COOKIE)?.value
}

async function me(app: App, token: string | undefined) {
  return app.inject({ method: 'GET', url: '/me', cookies: token ? { [SESSION_COOKIE]: token } : {} })
}

beforeEach(async () => {
  now = new Date('2026-11-21T10:00:00-03:00')
  await db.$executeRaw`TRUNCATE TABLE sessions, users CASCADE`
})

afterAll(async () => {
  await db.$disconnect()
})

describe('cadastro (R1, R2)', () => {
  it('CA1: cria a conta, já entra logado e /me devolve o usuário', async () => {
    const app = await makeApp()
    const response = await signup(app)

    expect(response.statusCode).toBe(201)
    const body = meResponseSchema.parse(response.json())
    expect(body.user).toMatchObject({ name: 'Ana Souza', email: 'ana@exemplo.com', phone: '11987654321' })
    expect(response.body).not.toContain('segredo123')

    const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE)
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' })

    const meResponse = await me(app, cookie?.value)
    expect(meResponse.statusCode).toBe(200)
    expect(meResponseSchema.parse(meResponse.json()).user.id).toBe(body.user.id)
  })

  it('guarda a senha só como hash argon2', async () => {
    const app = await makeApp()
    await signup(app)
    const user = await db.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } })
    expect(user.passwordHash).toMatch(/^\$argon2id\$/)
  })

  it('CA2: recusa e-mail já cadastrado, em qualquer caixa', async () => {
    const app = await makeApp()
    await signup(app)
    const response = await signup(app, { ...ana, email: 'ANA@Exemplo.COM' })

    expect(response.statusCode).toBe(409)
    expect(apiErrorSchema.parse(response.json())).toMatchObject({
      error: 'EMAIL_TAKEN',
      fields: { email: 'E-mail já cadastrado.' },
    })
  })

  it('aceita o mesmo telefone em contas diferentes', async () => {
    const app = await makeApp()
    await signup(app)
    const response = await signup(app, { ...ana, email: 'bia@exemplo.com' })
    expect(response.statusCode).toBe(201)
  })

  it('recusa telefone sem DDD com erro no campo', async () => {
    const app = await makeApp()
    const response = await signup(app, { ...ana, phone: '98765-4321' })

    expect(response.statusCode).toBe(400)
    expect(apiErrorSchema.parse(response.json()).fields).toHaveProperty('phone')
    expect(await db.user.count()).toBe(0)
  })
})

describe('login e logout (R3, R4)', () => {
  it('CA3: senha errada e e-mail inexistente recebem a mesma resposta genérica', async () => {
    const app = await makeApp()
    await signup(app)

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: ana.email, password: 'errada123' },
    })
    const unknownEmail = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ninguem@exemplo.com', password: 'errada123' },
    })

    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownEmail.statusCode).toBe(401)
    expect(wrongPassword.json()).toEqual(unknownEmail.json())
    expect(wrongPassword.json()).toEqual({ error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' })
    expect(sessionCookie(wrongPassword)).toBeUndefined()
  })

  it('CA3: login certo cria sessão nova; logout apaga a sessão do banco e /me responde 401', async () => {
    const app = await makeApp()
    const signupToken = sessionCookie(await signup(app))

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'Ana@Exemplo.com', password: ana.password },
      cookies: { [SESSION_COOKIE]: signupToken ?? '' },
    })
    expect(login.statusCode).toBe(200)
    const token = sessionCookie(login)
    expect(token).toBeDefined()
    expect(token).not.toBe(signupToken)
    // Sessão regenerada no login: a anterior deixa de valer.
    expect((await me(app, signupToken)).statusCode).toBe(401)
    expect(await db.session.count()).toBe(1)

    const logout = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { [SESSION_COOKIE]: token ?? '' } })
    expect(logout.statusCode).toBe(204)
    expect(await db.session.count()).toBe(0)
    expect((await me(app, token)).statusCode).toBe(401)
  })

  it('sessão expirada (7 dias) conta como não autenticada e é apagada', async () => {
    const app = await makeApp()
    const token = sessionCookie(await signup(app))

    now = new Date('2026-11-28T09:59:59-03:00')
    expect((await me(app, token)).statusCode).toBe(200)

    now = new Date('2026-11-28T10:00:00-03:00')
    expect((await me(app, token)).statusCode).toBe(401)
    expect(await db.session.count()).toBe(0)
  })

  it('/me sem cookie ou com token inventado responde 401', async () => {
    const app = await makeApp()
    expect((await me(app, undefined)).statusCode).toBe(401)
    expect((await me(app, 'token-inventado')).statusCode).toBe(401)
  })

  it('limita tentativas de login por IP', async () => {
    const app = await makeApp({ max: 2, timeWindow: '1 minute' })
    const attempt = () =>
      app.inject({ method: 'POST', url: '/auth/login', payload: { email: ana.email, password: 'errada123' } })

    await attempt()
    await attempt()
    const third = await attempt()
    expect(third.statusCode).toBe(429)
    expect(third.json()).toMatchObject({ error: 'RATE_LIMITED' })
  })
})
