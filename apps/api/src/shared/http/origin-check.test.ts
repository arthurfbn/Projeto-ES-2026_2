import { describe, expect, it } from 'vitest'
import { buildApp } from '../../app'

async function appWithEchoRoute(allowedOrigins: string[] = []) {
  return buildApp({
    probe: { isUp: async () => true },
    errorReporter: { capture() {}, async flush() {} },
    version: 'test',
    allowedOrigins,
    modules: [{ register: (app) => void app.post('/eco', async () => ({ ok: true })) }],
  })
}

describe('checagem de Origin em requisições que mudam estado', () => {
  it('aceita Origin igual ao host acessado via proxy (X-Forwarded-Host)', async () => {
    const app = await appWithEchoRoute()
    const response = await app.inject({
      method: 'POST',
      url: '/eco',
      headers: { origin: 'https://shavey.vercel.app', 'x-forwarded-host': 'shavey.vercel.app' },
    })
    expect(response.statusCode).toBe(200)
  })

  it('aceita Origin igual ao Host (proxy do Vite em desenvolvimento)', async () => {
    const app = await appWithEchoRoute()
    const response = await app.inject({
      method: 'POST',
      url: '/eco',
      headers: { origin: 'http://localhost:5173', host: 'localhost:5173' },
    })
    expect(response.statusCode).toBe(200)
  })

  it('aceita origem configurada explicitamente', async () => {
    const app = await appWithEchoRoute(['https://shavey.vercel.app'])
    const response = await app.inject({
      method: 'POST',
      url: '/eco',
      headers: { origin: 'https://shavey.vercel.app', host: 'api.up.railway.app' },
    })
    expect(response.statusCode).toBe(200)
  })

  it('recusa com 403 quando outro site tenta mudar estado', async () => {
    const app = await appWithEchoRoute()
    const response = await app.inject({
      method: 'POST',
      url: '/eco',
      headers: { origin: 'https://site-malicioso.com', host: 'shavey.vercel.app' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({ error: 'FORBIDDEN_ORIGIN' })
  })

  it('não interfere em GET', async () => {
    const app = await appWithEchoRoute()
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://site-malicioso.com' },
    })
    expect(response.statusCode).toBe(200)
  })
})
