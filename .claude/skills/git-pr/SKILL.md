---
name: git-pr
description: Use ao criar branch, fazer commit, abrir ou revisar pull request — trunk-based, Conventional Commits, Ship/Show/Ask, checagens antes do PR e revisão.
---

# Git e Pull Requests (ADR-0009)

## Branch
- A partir da `main` atualizada: `git switch -c <tipo>/<issue>-<descricao-curta>` (ex.: `feat/12-agendar-horario`).
- Vida máxima de 1–2 dias. Se crescer, fatie (feature flag por variável de ambiente se precisar entrar incompleta).
- Antes de abrir PR: `git fetch && git rebase origin/main`.

## Commits
- Conventional Commits, em português, imperativo: `feat(agenda): recusa agendamento sobreposto`.
- Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`, `build`.
- Um commit = uma mudança coerente. Proibido "ajustes", "final", "wip" na `main`.
- Nunca commitar `.env`, segredos, `node_modules`, builds.

## Antes de abrir o PR
```
pnpm lint && pnpm typecheck && pnpm test && pnpm test:int
```
Verifique o Definition of Done do `CLAUDE.md`.

## Abrir o PR
- Título = Conventional Commit da mudança principal; corpo pelo `.github/pull_request_template.md`, com `Closes #<issue>`.
- Classifique:
  - **Ask** (aprovação antes do merge): regra de negócio, schema/migration, autenticação/autorização, pagamento, segredos/CI.
  - **Show** (merge após CI, colega revisa depois): UI sem regra, docs, refactor coberto por testes.
  - **Ship** (direto, ainda via PR com CI): typo, texto trivial.
- Tamanho alvo: < 400 linhas alteradas (sem lockfile/gerados).
- `gh pr create --fill --label ask|show|ship`.

## Revisar
Ordem: (1) atende os critérios de aceite? (2) authz por barbearia (skill `seguranca-authz`); (3) regra no core e testada; (4) migration segura; (5) nomes seguem o CONTEXT.md; (6) algo pode ser removido?
Comentários com prefixo `bloqueante:`, `sugestão:` ou `dúvida:`.

## Merge
Squash merge com título Conventional Commit; apagar a branch. Main quebrada = prioridade zero: reverter primeiro, investigar depois.
