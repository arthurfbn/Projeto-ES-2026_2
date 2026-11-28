# 0024 — Versionamento semântico e releases no GitHub

- **Status:** aceito (complementa o ADR-0020)
- **Data:** 2026-11-27

## Contexto
O ADR-0020 define a release como o PR `develop → main`, mas não diz como identificar cada versão que chega à produção. Sem um número, fica difícil dizer o que estava no ar numa demo, comparar duas entregas ou voltar a um ponto conhecido. Os `package.json` estão em `0.0.0` e não são publicados (pacotes privados do monorepo).

## Decisão
- **Semantic Versioning** (`MAJOR.MINOR.PATCH`), com tag `vX.Y.Z` e **GitHub Release** criada no commit de merge da release na `main`. A tag é a fonte da verdade da versão; os `package.json` continuam em `0.0.0`.
- **Fase `0.x` (MVP em desenvolvimento inicial):**
  - **MINOR** (`0.1.0` → `0.2.0`): release `develop → main` que leva funcionalidade nova (normalmente uma por semana ou demo).
  - **PATCH** (`0.2.0` → `0.2.1`): release só com correções, inclusive `fix/...` direto na `main` (ADR-0020).
  - Mudança incompatível não sobe MAJOR enquanto estivermos em `0.x`.
- **`1.0.0`** é a versão apresentada ao vivo (07/12), quando a dupla declarar o MVP completo. A partir dela, MAJOR para mudança incompatível de API ou de dados.
- **Quem e quando:** quem fizer o merge do PR de release cria a tag e a release logo em seguida, a partir da `main` atualizada:
  ```
  git fetch origin
  gh release create vX.Y.Z --target <sha do merge na main> --title "vX.Y.Z — <resumo>" --notes-file <notas.md> --latest
  ```
  Fix direto na `main` também ganha release (PATCH) depois do merge.
- **Notas da release** em português, agrupadas por assunto (funcionalidades, correções, infra e docs), citando os PRs (`#n`). O título do PR de release segue `release: vX.Y.Z — <resumo>`.
- **Histórico** fica nas releases do GitHub (`gh release list`), sem `CHANGELOG.md` duplicado.

| Versão | Data | Conteúdo |
|---|---|---|
| `v0.1.0` | 2026-11-27 | Semana 1: contas e montagem da barbearia (PR #42) |

## Alternativas
- **Versão por data** (`2026.11.27`): simples, mas não diz se a entrega tem funcionalidade nova ou só correção.
- **Ferramenta automática** (semantic-release, changesets): calcula a versão pelos commits, mas é mais uma configuração e mais um passo de CI para 2 pessoas e 3 semanas (ADR-0010).
- **Versão nos `package.json`**: exigiria um commit de bump a cada release, passando pela `develop`, sem ganho visível, já que nada é publicado.

## Consequências
- Cada demo aponta para uma tag: dá para comparar (`git diff v0.1.0 v0.2.0`) e voltar a um ponto conhecido.
- Um passo manual a mais depois do merge da release; se for esquecido, criar a tag depois, no mesmo commit de merge.
