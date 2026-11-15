---
name: frontend-vue
description: Use ao criar ou alterar telas, componentes, rotas, stores ou chamadas à API em apps/web — convenções Vue 3, TanStack Query, shadcn-vue, design tokens e testes de componente.
---

# Frontend (apps/web) — ADR-0005

## Estrutura
```
apps/web/src/
  features/<contexto>/      agenda | barbearias | conta | pagamentos | painel-barbeiro
    pages/                  componentes de rota (finos: compõem e chamam composables)
    components/             componentes da feature
    api.ts                  funções fetch tipadas com packages/contracts
    queries.ts              composables TanStack Query (useX / useXMutation)
  components/ui/            shadcn-vue (gerado; editar só para ajustes de marca)
  styles/tokens.css         ÚNICO lugar com cores, fontes, raios da marca
  router/  stores/  lib/
```

## Regras
- `<script setup lang="ts">`, Composition API. Props e emits tipados.
- Dados do servidor → TanStack Query (cache, loading, erro, invalidação). Pinia só para estado de UI e sessão. Nunca duplicar dados do servidor no Pinia.
- Cliente HTTP único (`lib/http.ts`) com `credentials: 'include'`; valida respostas com o schema Zod do contrato.
- Toda tela trata três estados: carregando (skeleton), erro (mensagem + tentar de novo), vazio.
- Estilo só com classes Tailwind ligadas aos tokens (`bg-primary`, `text-foreground`). Nunca cor hex ou fonte literal em componente.
- Mobile first (o cliente agenda pelo celular); checar em 375 px.
- Acessibilidade: labels em inputs, foco visível, contraste AA, `<button>` de verdade.
- Datas em `America/Sao_Paulo` com `Intl.DateTimeFormat('pt-BR')`; dinheiro com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` a partir de centavos.
- Textos de UI em português com os termos do `docs/CONTEXT.md`.
- Rotas protegidas por guard que consulta `/me`; o backend continua sendo a autoridade de permissão.

## Testes
- Componentes/composables: Vitest + Vue Test Utils + MSW (handlers baseados nos contratos). Teste o que o usuário vê e faz, não o estado interno.
- E2E (Playwright) só para as jornadas críticas do ADR-0008.

## Não faça
- Não instale outra biblioteca de componentes, CSS-in-JS ou state manager.
- Não use `v-html` com dados do usuário.
- Não guarde sessão em localStorage.
