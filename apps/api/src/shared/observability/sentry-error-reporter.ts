import * as Sentry from '@sentry/node'
import type { ErrorReporter } from './error-reporter'

/** Adapter Sentry da porta ErrorReporter. Trocar de ferramenta = escrever outro adapter. */
export function createSentryErrorReporter(options: {
  dsn: string
  environment: string
  release: string
}): ErrorReporter {
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
  })
  return {
    capture(error, context) {
      Sentry.captureException(error, context ? { extra: context } : undefined)
    },
    async flush(timeoutMs = 2000) {
      await Sentry.flush(timeoutMs)
    },
  }
}
