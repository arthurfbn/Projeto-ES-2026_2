# 0006 — Autenticação por sessão em cookie httpOnly

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
O projPOO usava JWT guardado no navegador. Token em localStorage fica exposto a XSS e não pode ser revogado com facilidade.

## Decisão
- Sessão opaca: tabela `sessions` (id aleatório, `user_id`, `expires_at`); o cookie guarda só o id.
- Cookie `httpOnly`, `Secure`, `SameSite=Lax`, domínio do produto.
- API publicada em subdomínio do domínio próprio (`api.<dominio>`), apontado para o Railway, para o cookie ser same-site com o front na Vercel.
- Senhas com bcrypt (custo ≥ 12) ou argon2.
- Logout e expiração apagam a sessão no banco.

## Alternativas
- JWT em localStorage: mais simples, mais arriscado.
- Provedor externo (Clerk/Auth0) ou biblioteca de auth completa: rápido, mas esconde um tema que a disciplina quer que dominemos.

## Consequências
- Requer CORS com `credentials: true` e origem explícita.
- Formulários que mudam estado precisam de proteção CSRF básica (SameSite=Lax + checagem de `Origin`).
