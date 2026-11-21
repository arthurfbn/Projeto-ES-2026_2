import type { FastifyInstance } from 'fastify'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const firstValue = (header: string | string[] | undefined) =>
  (Array.isArray(header) ? header[0] : header)?.split(',')[0]?.trim()

/**
 * Proteção CSRF básica (ADR-0006): requisição que muda estado vinda de navegador precisa ter
 * `Origin` igual ao host que o navegador acessou (Vercel/Vite repassam via proxy) ou a uma
 * origem permitida na configuração. Sem `Origin` (curl, testes), segue: o ataque CSRF depende
 * de um navegador, e navegadores sempre mandam `Origin` em POST entre sites.
 */
export function registerOriginCheck(app: FastifyInstance, allowedOrigins: readonly string[]): void {
  app.addHook('onRequest', async (request, reply) => {
    if (SAFE_METHODS.has(request.method)) return
    const origin = request.headers.origin
    if (!origin) return
    if (allowedOrigins.includes(origin)) return

    let originHost: string
    try {
      originHost = new URL(origin).host
    } catch {
      return reply.code(403).send({ error: 'FORBIDDEN_ORIGIN' })
    }
    const visitedHost = firstValue(request.headers['x-forwarded-host']) ?? request.headers.host
    if (originHost === visitedHost || originHost === request.headers.host) return

    return reply.code(403).send({ error: 'FORBIDDEN_ORIGIN' })
  })
}
