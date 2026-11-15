---
name: tdd-core
description: Use ao implementar ou alterar qualquer regra de negócio na API — conduz TDD (red, green, refactor) no core puro do módulo e define onde cada tipo de teste mora.
---

# TDD no Functional Core

## Onde o código vai (ADR-0003)
- Regra de negócio (decidir, calcular, validar estado) → `modules/<m>/core/*.ts`, função pura.
- Orquestração (buscar, chamar core, salvar, chamar gateway) → `modules/<m>/app/*.ts`.
- Se uma função do core precisa de `Date.now()`, banco ou rede, ela está no lugar errado: receba o valor por parâmetro.

## Ciclo
1. **RED** — escreva UM teste de comportamento a partir de um critério de aceite (`core/*.test.ts`). Nome em português descrevendo o comportamento: `it('recusa agendamento que sobrepõe outro do mesmo barbeiro')`. Rode e veja falhar pelo motivo certo.
2. **GREEN** — o mínimo de código para passar. Nada além.
3. **REFACTOR** — melhore nomes e duplicação com os testes verdes. Rode tudo.
4. Repita por critério. Commit a cada ciclo verde relevante (`test:` / `feat:`).

## Formato do core
```ts
type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E }

export function canBook(input: {
  request: BookingRequest
  existing: Appointment[]
  availability: AvailabilityWindow[]
  now: Date
}): Result<NewAppointment, 'SLOT_IN_PAST' | 'OUTSIDE_AVAILABILITY' | 'OVERLAPS_EXISTING'> {
  …
}
```
- Erros esperados são códigos (string literal), mapeados para HTTP só em `http/`.
- Dados entram como objetos simples; nada de entidades com métodos que acessam banco.

## Testes de cada nível
| Arquivo | O que testa | Dublês |
|---|---|---|
| `core/*.test.ts` | regras puras | nenhum |
| `app/*.int.test.ts` | caso de uso + Prisma + Postgres real | só Stripe/e-mail (fake implementando o port) |
| `http/*.int.test.ts` | rota via `app.inject()` (status, contrato, authz) | idem |

## Regras
- Teste comportamento observável (retorno, estado salvo), nunca "chamou o método X".
- Nunca mock do Prisma. Use o banco de teste (`pnpm test:int`, que sobe via docker compose e roda migrations).
- Cada teste de integração limpa os dados que cria (truncate por teste ou transação).
- Bug encontrado → primeiro um teste que falha reproduzindo o bug.
- Datas de teste fixas e explícitas com fuso (`2026-12-01T13:00:00-03:00`).
