# 0020 — Branch `develop` e ambiente de homologação

- **Status:** aceito (substitui a parte "trunk-based" do ADR-0009)
- **Data:** 2026-11-21

## Contexto
O ADR-0009 previa trunk-based: toda fatia entrava direto na `main`, que é produção. Com os dois desenvolvendo em paralelo a partir da semana 1, queremos validar as fatias juntas (inclusive com banco e deploy reais) antes de chegarem à produção usada na demo, sem que uma fatia em teste derrube o que já está apresentável.

## Decisão
- **`develop`** é a branch de integração: toda fatia sai dela (`feat/<issue>-<descricao>`) e volta para ela por PR com CI verde (Ship/Show/Ask como no ADR-0009; squash merge).
- **`main`** é a branch principal (padrão do GitHub) e é produção: recebe a `develop` validada numa **release** (PR `develop → main`, merge commit), no mínimo antes de cada demo semanal.
- **Correção urgente em produção:** branch `fix/...` a partir da `main`, PR para a `main` e, em seguida, `main` mergeada de volta na `develop`.
- **Ambientes:**

| Branch | Web (Vercel) | API + banco (Railway) | Para quê |
|---|---|---|---|
| `develop` | domínio da branch `develop` | ambiente `develop`, com Postgres próprio | homologação: validar fatias juntas |
| `main` | domínio de produção | ambiente `production` | demo e uso real |
| PR | preview da Vercel | API da `develop` | conferir a tela da fatia |

- O `vercel.json` escolhe a API pelo domínio acessado (regra `has` por host): o domínio de produção vai para a API de produção; os demais (develop e previews) para a API da `develop`.
- Branches de trabalho continuam curtas (1–2 dias) e a `develop` também fica sempre implantável: quebrou, reverte primeiro.

## Alternativas
- Manter trunk-based na `main`: menos passos, mas cada fatia em teste vai direto para a produção da demo.
- Git Flow completo (release/hotfix branches): cerimônia demais para 3 semanas e 2 pessoas.

## Consequências
- Dois Postgres e duas APIs no Railway: o consumo do trial praticamente dobra (acompanhar **Usage**; plano B do ADR-0016).
- A `main` segue como branch padrão: PRs de fatia precisam escolher a base `develop` (`gh pr create --base develop`), e `Closes #n` só fecha a issue quando a fatia chega à produção, na release.
- Métricas DORA de deploy contam as promoções para a `main` (produção); o lead time conta do primeiro commit da fatia até a produção.
