# 0005 — Frontend em Vue 3 com Tailwind v4 + shadcn-vue (sem Vuetify)

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
O nome e a identidade visual ainda não estão decididos (finalistas com estilos muito diferentes). O projPOO usava Vuetify, que impõe a linguagem visual do Material Design. O produto deve virar app depois.

## Decisão
- Vue 3 + Vite + TypeScript, Vue Router, Pinia (estado de UI/sessão) e TanStack Query (dados do servidor).
- Tailwind v4 + componentes shadcn-vue (sobre Reka UI), copiados para `apps/web/src/components/ui`.
- Identidade da marca como **design tokens** (variáveis CSS em `apps/web/src/styles/tokens.css`: cores, fontes, raios), gerados a partir de `docs/design-system.md` (marca Shavey: marinho, latão, vermelho poste, papel; Bricolage Grotesque + Inter). Trocar de marca = trocar esse arquivo.
- PWA agora; app nativo depois via Capacitor reaproveitando o mesmo código.
- Sem SSR/Nuxt no MVP.

## Alternativas
- Manter Vuetify: mais componentes prontos, mas customizar a marca custa caro.
- Nuxt: SEO para páginas públicas, mas mais conceitos e deploy mais complexo.

## Consequências
- Componentes acessíveis e sob nosso controle; um pouco mais de montagem inicial.
- Componentes nunca usam cor/fonte literal, só tokens.
