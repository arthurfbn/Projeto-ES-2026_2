# 0008 — Estratégia de testes

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Código gerado por IA precisa de feedback rápido e confiável. O prazo não comporta suíte E2E extensa.

## Decisão
| Nível | Ferramenta | Escopo |
|---|---|---|
| Unidade (maioria) | Vitest | `core/` de cada módulo, escrito em TDD |
| Integração | Vitest + Postgres real (docker compose local, service container no CI) | casos de uso com Prisma, constraints, webhook |
| Componente | Vitest + Vue Test Utils + MSW | telas e composables com API simulada |
| E2E (2–4 jornadas) | Playwright contra o preview da Vercel | agendar, pagar, ver agenda do barbeiro |

- Testar comportamento observável, não chamadas internas.
- Mocks só para fronteiras externas (Stripe, e-mail, relógio).
- Sem meta de cobertura numérica; regra de negócio sem teste não entra.

## Alternativas
- Testcontainers: isolamento melhor, mais configuração; desnecessário com service container.

## Consequências
- Integração exige Docker local.
- E2E não bloqueia merge no início (roda após deploy de preview); passa a bloquear quando estabilizar.
