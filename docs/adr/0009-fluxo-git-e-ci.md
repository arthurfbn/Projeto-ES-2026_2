# 0009 — Fluxo Git (trunk-based) e CI/CD

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Branches longas geram conflitos e feedback tardio. Queremos medir entrega (DORA).

## Decisão
- `main` sempre implantável e protegida (merge só via PR com CI verde).
- Branches curtas (`tipo/numero-descricao`, ex.: `feat/12-agendar-horario`), vivendo no máximo 1–2 dias.
- Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`), commits pequenos e coesos.
- PRs no modelo Ship/Show/Ask: Ask (revisão obrigatória) para regra de negócio, schema, segurança e pagamento; Show para o resto.
- Feature incompleta entra atrás de flag simples (variável de ambiente) em vez de branch longa.
- GitHub Actions no PR: install → lint → typecheck → unit → integração (Postgres service) → `prisma migrate diff` sem drift.
- Deploy: Vercel preview por PR e produção ao entrar na `main`; Render faz deploy da API na `main` rodando `prisma migrate deploy` contra o Neon (ADR-0015).
- Repositório **público** na conta pessoal do Arthur (Bruno como colaborador), sem licença de código aberto: todos os direitos reservados. Isso evita a restrição do plano Hobby da Vercel a deploys de repositórios privados. Se commits de colaboradores ainda forem barrados, o deploy do front passa para o GitHub Actions com a Vercel CLI e um token do dono (`VERCEL_TOKEN`).
- Por ser público: segredos apenas em GitHub/Vercel/Render Secrets, nunca em arquivos; secret scanning e push protection do GitHub ativados.
- Dependabot semanal e CodeQL.
- DORA: frequência de deploy e lead time extraídos dos PRs/deploys; taxa de falha e tempo de recuperação anotados em `docs/incidentes.md`.

## Consequências
- Requer disciplina de fatiar tarefas pequenas (skill `spec-e-tickets`).
