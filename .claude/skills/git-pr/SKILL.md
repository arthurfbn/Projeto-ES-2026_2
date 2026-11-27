---
name: git-pr
description: Use ao criar branch, fazer commit, abrir ou revisar pull request — develop/main, Conventional Commits, Ship/Show/Ask, checagens antes do PR e revisão.
---

# Git e Pull Requests (ADR-0009, ADR-0020)

## Branch
- `develop` = integração/homologação; `main` = produção (só recebe a `develop` validada).
- A partir da `develop` atualizada: `git switch -c <tipo>/<issue>-<descricao-curta>` (ex.: `feat/12-agendar-horario`). PR sempre para a `develop`.
- Correção urgente em produção: `fix/...` a partir da `main`, PR para a `main`, depois `main` mergeada de volta na `develop`.
- Vida máxima de 1–2 dias. Se crescer, fatie (feature flag por variável de ambiente se precisar entrar incompleta).
- Antes de abrir PR: `git fetch && git rebase origin/develop`.

## Commits
- Conventional Commits, em português, imperativo: `feat(agenda): recusa agendamento sobreposto`.
- Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`, `build`.
- Um commit = uma mudança coerente. Proibido "ajustes", "final", "wip" na `develop` e na `main`.
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
- `gh pr create --base develop --fill --label ask|show|ship`.

## Revisar
Ordem: (1) atende os critérios de aceite? (2) authz por barbearia (skill `seguranca-authz`); (3) regra no core e testada; (4) migration segura; (5) nomes seguem o CONTEXT.md; (6) algo pode ser removido?
Comentários com prefixo `bloqueante:`, `sugestão:` ou `dúvida:`.

## Merge
Fatia → `develop`: squash merge com título Conventional Commit; apagar a branch.
Release `develop` → `main`: PR com merge commit (não squash), CI verde e conferência no ambiente da `develop`; no mínimo antes de cada demo. A `main` é a branch padrão: issues com `Closes #n` fecham na release.

## Versão e release (ADR-0024)
- Semantic Versioning com tag `vX.Y.Z` e GitHub Release no commit de merge da release na `main`. A tag é a fonte da verdade; `package.json` fica em `0.0.0`.
- Em `0.x`: release com funcionalidade nova sobe **MINOR**; só correções (inclusive `fix/...` na `main`) sobe **PATCH**. `1.0.0` = versão da apresentação (07/12).
- Título do PR de release: `release: vX.Y.Z — <resumo>`. Logo após o merge, quem mesclou cria a release:
  `gh release list` (última versão) → `gh release create vX.Y.Z --target <sha do merge> --title "vX.Y.Z — <resumo>" --notes-file <notas.md> --latest`.
- Notas em português, agrupadas por assunto, citando os PRs. Acrescente a linha da versão na tabela do ADR-0024.
`develop` ou `main` quebrada = prioridade zero: reverter primeiro, investigar depois.
