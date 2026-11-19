/** Resultado de regras do core: erros esperados são valores, não exceções (ADR-0003). */
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const fail = <E extends string>(error: E): Result<never, E> => ({ ok: false, error })
