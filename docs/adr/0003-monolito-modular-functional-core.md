# 0003 — Monólito modular com Functional Core / Imperative Shell

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Duas pessoas, um mês. Microsserviços trariam custo de rede, deploy e dados distribuídos sem benefício organizacional (Monolith First). Ao mesmo tempo, queremos regras de negócio testáveis sem banco e fronteiras que permitam crescer.

## Decisão
- A API é um único deploy, dividido em módulos por contexto de negócio: `identidade`, `barbearias`, `agenda`, `pagamentos`, `comissoes`.
- Cada módulo tem `core/` (funções puras), `app/` (casos de uso + ports), `adapters/` (Prisma, Stripe) e `http/` (rotas), e expõe só seu `index.ts`.
- O core não faz I/O: recebe dados e o horário atual como parâmetros e retorna `Result`.
- Dependências apontam para dentro (ports & adapters).

## Alternativas
- Camadas globais (`controllers/`, `services/`, `repositories/`) como no projPOO: mais simples no início, mas mistura contextos e espalha cada mudança.
- Microsserviços: descartado (ver contexto).

## Consequências
- Testes de regra rodam em milissegundos sem mocks.
- Um módulo pode ser extraído no futuro se uma métrica justificar.
- Exige disciplina: lint de import (`eslint-plugin-boundaries` ou regra `no-restricted-imports`) bloqueia importação interna entre módulos.
