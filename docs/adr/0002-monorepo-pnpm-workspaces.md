# 0002 — Monorepo com pnpm workspaces

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Web e API evoluem juntas e compartilham contratos. O projeto anterior (projPOO) já usava monorepo com npm workspaces.

## Decisão
Um repositório com pnpm workspaces:
- `apps/web` — Vue (Vercel)
- `apps/api` — Fastify (Render)
- `packages/contracts` — schemas Zod de request/response e tipos derivados, importados pelos dois apps

Sem Turborepo/Nx por enquanto.

## Alternativas
- npm workspaces: funciona, mas instalação mais lenta e hoisting mais permissivo.
- Dois repositórios: exige versionar e publicar contratos; mudanças atômicas ficam difíceis.

## Consequências
- Uma mudança de contrato quebra o typecheck dos dois lados no mesmo PR (feedback rápido).
- Vercel e Render precisam apontar o diretório raiz/filtro do app correspondente.
