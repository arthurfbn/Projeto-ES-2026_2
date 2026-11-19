import { describe, expect, it } from 'vitest'
import { healthResponseSchema } from '@shavey/contracts'
import { buildApp } from '../../app'
import type { ErrorReporter } from '../observability/error-reporter'

const silentReporter: ErrorReporter = { capture() {}, async flush() {} }

async function appWithDatabase(up: boolean) {
  return buildApp({
    probe: { isUp: async () => up },
    errorReporter: silentReporter,
    version: 'test',
  })
}

describe('GET /health', () => {
  it('responde 200 e status ok quando o banco responde', async () => {
    const app = await appWithDatabase(true)
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(healthResponseSchema.parse(response.json())).toEqual({
      status: 'ok',
      database: 'up',
      version: 'test',
    })
  })

  it('responde 503 e status degraded quando o banco não responde', async () => {
    const app = await appWithDatabase(false)
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({ status: 'degraded', database: 'down' })
  })

  it('envia o erro para o ErrorReporter e não vaza detalhes em falha inesperada', async () => {
    const captured: unknown[] = []
    const app = await buildApp({
      probe: {
        isUp: async () => {
          throw new Error('falha interna com detalhe sensível')
        },
      },
      errorReporter: { capture: (error) => captured.push(error), async flush() {} },
      version: 'test',
    })

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(500)
    expect(response.body).not.toContain('sensível')
    expect(captured).toHaveLength(1)
  })
})
