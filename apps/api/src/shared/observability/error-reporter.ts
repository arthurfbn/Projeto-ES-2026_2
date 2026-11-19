/**
 * Porta de captura de erros (ADR-0017). O código da aplicação só conhece esta interface;
 * qual ferramenta recebe os erros é decidido na composição (app.ts / server.ts).
 */
export interface ErrorReporter {
  capture(error: unknown, context?: Record<string, unknown>): void
  flush(timeoutMs?: number): Promise<void>
}

type LogFn = (obj: Record<string, unknown>, msg: string) => void

/** Adapter padrão: escreve o erro no log estruturado. Usado quando não há SENTRY_DSN. */
export function createConsoleErrorReporter(log: LogFn): ErrorReporter {
  return {
    capture(error, context) {
      log({ err: error, ...context }, 'erro capturado')
    },
    async flush() {},
  }
}
