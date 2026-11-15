# 0001 — Registrar decisões arquiteturais com ADRs

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
O projeto é feito em dupla, com prazo curto e geração de código por IA. Decisões que ficam só em conversa se perdem, e agentes de IA tendem a "ajudar demais" trocando bibliotecas ou criando estruturas novas.

## Decisão
Toda decisão difícil de reverter, com alternativas reais ou que afete arquitetura, dados, segurança ou custo vira um ADR curto em `docs/adr/NNNN-titulo.md` (Contexto, Decisão, Alternativas, Consequências). ADRs não são editados depois de aceitos: são substituídos por outro ADR.

## Consequências
- Agentes leem `docs/adr/` antes de propor mudanças estruturais.
- Custo: alguns minutos por decisão.
