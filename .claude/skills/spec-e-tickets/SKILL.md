---
name: spec-e-tickets
description: Use depois do grill para transformar o entendimento fechado de uma feature em spec curta e issues do GitHub em fatias verticais (tracer bullets), com critérios de aceite e dependências.
---

# Spec → tickets em fatias verticais

## Pré-condição
Existe resumo do grill (ou a dupla confirma as regras na conversa). Esta skill **não inventa decisões**: o que não estiver decidido vai para "Perguntas em aberto" e volta ao grill.

## 1. Spec (em `docs/specs/NNN-nome.md`)
Seções, nessa ordem:
- **Objetivo / outcome**: qual comportamento do usuário muda e como saberemos.
- **Conceitos do domínio** (termos do CONTEXT.md usados).
- **Regras de negócio** numeradas (R1, R2…).
- **Critérios de aceite** em Given/When/Then, cada um referenciando regras.
- **Fora de escopo** (explícito — protege contra a IA "ajudar demais").
- **Restrições** (performance, segurança, ADRs relevantes).
- **Perguntas em aberto.**

## 2. Tickets
- Cada ticket é uma **fatia vertical**: atravessa banco → core → caso de uso → rota → tela → testes e termina em algo demonstrável no preview.
- Proibido ticket por camada ("criar tabelas", "fazer API", "fazer tela").
- Tamanho: cabe em 1 dia de trabalho de uma pessoa com IA; se não cabe, fatie por regra ou por caminho feliz/erro.
- Primeiro ticket de uma feature = caminho feliz mais fino possível; regras extras viram tickets seguintes.

Template de issue:
```md
## Comportamento
Como <papel>, quero <ação> para <resultado>.

## Critérios de aceite
- [ ] Given … When … Then …

## Regras cobertas
R1, R3 (docs/specs/NNN-nome.md)

## Camadas tocadas
[ ] migration [ ] core [ ] caso de uso [ ] rota/contrato [ ] tela [ ] E2E

## Depende de
#issue

## Fora de escopo
…
```

## 3. Publicar
Criar as issues com `gh issue create` (labels: `feature`, módulo, `ask`/`show`), na ordem das dependências. Mostrar a lista para a dupla antes de criar.
