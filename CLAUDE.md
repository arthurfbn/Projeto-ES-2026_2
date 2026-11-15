# CLAUDE.md — Shavey

Shavey: sistema de agendamento e gestão de barbearias. MVP de um produto comercial (site primeiro, app depois) feito em dupla (Arthur e Bruno) para a disciplina de Engenharia de Software (UNIFESP, 2026/2): 3 semanas de desenvolvimento, apresentação ao vivo em 07/12/2026, forte apoio de IA. Contexto social: ODS 8 — formalizar e dar transparência à relação de trabalho do barbeiro (`docs/ods.md`).

**Regra de ouro:** MVP completo, não robusto ao extremo. Toda escolha é julgada pelo custo da próxima mudança. Antes de adicionar tecnologia, biblioteca ou camada, pergunte: "isso vira funcionalidade visível neste mês?" Se não, registre como fora de escopo (ADR-0010).

## Stack (ver docs/adr/)
- Monorepo **pnpm workspaces**: `apps/web` (Vue), `apps/api` (Fastify), `packages/contracts` (schemas Zod compartilhados).
- **Web:** Vue 3 + Vite + TypeScript, Pinia, Vue Router, TanStack Query, Tailwind v4 + shadcn-vue (Reka UI). Deploy na Vercel.
- **API:** Node + Fastify 5 + TypeScript, Zod, Prisma, pino. Deploy no Railway.
- **Banco:** PostgreSQL no Railway, via Prisma (SQL manual quando o Prisma não expressa).
- **Pagamento:** Stripe Checkout em modo teste.
- **Testes:** Vitest (tudo), Vue Test Utils + MSW (web), Postgres real em CI (integração), Playwright (poucos E2E).

## Fluxo de trabalho (obrigatório)
1. Feature nova ou regra ambígua → skill `grill-barbearia` (atualiza `docs/CONTEXT.md` e `docs/adr/`).
2. Entendimento fechado → skill `spec-e-tickets` (issues no GitHub em fatias verticais).
3. Implementação → skill `tdd-core` no núcleo de domínio; demais regras nas skills `banco-migrations`, `seguranca-authz`, `pagamentos-stripe`, `frontend-vue`.
4. Entrega → skill `git-pr` (commit, PR, checagens).
Nunca pule do pedido vago direto para código.

## Linguagem do domínio
`docs/CONTEXT.md` é a fonte da verdade dos termos. Use o termo canônico em código, UI, testes e commits. Termo novo ou ambíguo → pare e atualize o CONTEXT.md antes.

## Arquitetura da API (ADR-0003)
```
apps/api/src/
  modules/<contexto>/      identidade | barbearias | agenda | pagamentos | comissoes
    core/                  funções puras: regras de negócio. Sem I/O, sem Prisma, sem Date.now()
    app/                   casos de uso: buscam dados via ports, chamam o core, persistem
    adapters/              implementações dos ports (Prisma, Stripe, e-mail)
    http/                  rotas Fastify + schemas de packages/contracts
    index.ts               API pública do módulo — único ponto importável por outros módulos
  shared/                  db client, erros, config, logger
```
- Dependências apontam para dentro: `http → app → core`; `adapters` implementam ports definidos em `app`.
- `core` recebe tempo e dados como parâmetros e retorna `Result` (`{ ok: true, value } | { ok: false, error: 'CODIGO_ERRO' }`). Erros esperados são valores, não exceções.
- Um módulo nunca importa arquivos internos de outro; só seu `index.ts`. Nunca acesse tabelas de outro módulo diretamente.

## Regras de código
- TypeScript `strict`. Sem `any` (use `unknown` + validação). Sem `// @ts-ignore`.
- Toda entrada externa (HTTP, webhook, env) validada com Zod na borda. Schemas de request/response vivem em `packages/contracts` e são importados pela web e pela API.
- Dinheiro em **centavos (int)**. Datas em UTC no banco (`timestamptz`); exibição em `America/Sao_Paulo`.
- Nomes em inglês no código; termos do domínio seguem o mapeamento do CONTEXT.md. UI em português.
- Funções pequenas, nomes que revelam intenção, sem abstração especulativa (YAGNI).

## Segurança (resumo — skill `seguranca-authz`)
- Toda operação de negócio é escopada por `barbershopId` e verifica o vínculo do usuário com a barbearia.
- Sessão por cookie httpOnly; nunca token em localStorage.
- Segredos só em variáveis de ambiente (Vercel/Railway). Nunca commitar `.env`. Nunca logar senha, token, cookie ou payload de cartão.

## Testes (resumo — skill `tdd-core`)
- Teste comportamento, não implementação. Core: testes de unidade puros, escritos antes (RED → GREEN → REFACTOR).
- Integração contra Postgres real para repositórios, restrições do banco e webhook.
- Mock apenas em fronteiras externas (Stripe, e-mail). Nunca mock do Prisma.
- Bug corrigido = teste que reproduz o bug.

## Definition of Done
- [ ] Critérios de aceite da issue cobertos por testes
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passando localmente e no CI
- [ ] Migration incluída (se mexeu no schema) e reversível pelo padrão expand/contract
- [ ] CONTEXT.md / ADR atualizados se mudou linguagem ou decisão
- [ ] Preview da Vercel verificado manualmente no fluxo afetado
- [ ] PR pequeno, revisado pelo colega (ou Ship/Show justificado)

## Comandos
<!-- preencher quando o scaffold existir -->
- `pnpm dev` — web + api
- `pnpm test` / `pnpm test:int` / `pnpm e2e`
- `pnpm db:migrate` / `pnpm db:seed`
- `stripe listen --forward-to localhost:3333/webhooks/stripe`

## Não faça
- Não adicione Redis, filas, microsserviços, Kubernetes, GraphQL, SSR/Nuxt, OpenTelemetry ou RLS neste MVP (ADR-0010).
- Não troque de biblioteca/stack sem ADR.
- Não gere telas, endpoints ou tabelas "que podem ser úteis depois".
- Não invente regra de negócio: pergunte ou rode o grill.
