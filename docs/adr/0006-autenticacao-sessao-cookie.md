# 0006 — Autenticação por sessão em cookie httpOnly

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
O projPOO usava JWT guardado no navegador. Token em localStorage fica exposto a XSS e não pode ser revogado com facilidade.

## Decisão
- Sessão opaca: tabela `sessions` (id aleatório, `user_id`, `expires_at`); o cookie guarda só o id.
- Cookie `httpOnly`, `Secure`, `SameSite=Lax`, sem atributo `Domain`.
- Front e API na mesma origem: a Vercel faz proxy de `/api/*` para a API (ADR-0015); em desenvolvimento, o proxy do Vite.
- Senhas com bcrypt (custo ≥ 12) ou argon2.
- Logout e expiração apagam a sessão no banco.

## Alternativas
- JWT em localStorage: mais simples, mais arriscado.
- Provedor externo (Clerk/Auth0) ou biblioteca de auth completa: rápido, mas esconde um tema que a disciplina quer que dominemos.

## Consequências
- Sem CORS em produção (mesma origem). Se algum cliente precisar chamar a API direto, CORS com origem explícita e `credentials: true`.
- Formulários que mudam estado precisam de proteção CSRF básica (SameSite=Lax + checagem de `Origin`).
