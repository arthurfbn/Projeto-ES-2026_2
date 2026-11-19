---
name: seguranca-authz
description: Use ao criar ou alterar rotas, autenticação, permissões, cookies, CORS, uploads, variáveis de ambiente ou dependências — checklist de segurança do projeto (OWASP, segredos, autorização por barbearia).
---

# Segurança por design

## Autorização (o erro mais provável deste sistema)
Toda rota de negócio responde três perguntas, nesta ordem:
1. **Quem é?** → sessão válida (`request.user`), senão 401.
2. **Em qual barbearia?** → `barbershopId` vem da rota, nunca do corpo.
3. **Pode?** → vínculo do usuário com essa barbearia e papel suficiente; para recursos de cliente, `resource.clientId === user.id`. Senão **404** (não revele existência) ou 403.

Exemplo de falha a evitar: `GET /appointments/:id` que busca pelo id sem checar barbearia/dono.

- A verificação mora em um único helper/hook (`requireMembership(role)`, `requireOwnerOf(resource)`), não espalhada.
- Todo teste de rota inclui pelo menos um caso de **outro usuário / outra barbearia** recebendo 404/403.

## Sessão e cookies (ADR-0006)
- Cookie `httpOnly; Secure; SameSite=Lax`; id de sessão aleatório (32 bytes).
- Regenerar sessão no login; apagar no logout.
- Rate limit em login e cadastro (`@fastify/rate-limit`).
- Mensagem de login genérica ("e-mail ou senha inválidos").
- Web e API na mesma origem via proxy `/api` da Vercel (ADR-0015): sem CORS em produção. Se CORS for necessário, origem explícita e `credentials: true`. Nunca `*`.
- Para métodos que alteram estado, checar header `Origin`.

## Entradas
- Tudo validado com Zod (`packages/contracts`) antes de chegar ao caso de uso; rejeitar campos desconhecidos (`.strict()`).
- Nunca montar SQL por concatenação. Nunca renderizar HTML vindo do usuário (`v-html` proibido com dados do usuário).

## Segredos
- Só em variáveis de ambiente (Railway/Vercel/GitHub Secrets). `.env` no `.gitignore`; `.env.example` sem valores reais.
- Config validada com Zod na inicialização (falha cedo se faltar variável).
- Nunca logar: senha, hash, cookie, token, `Authorization`, payload de webhook completo. Configure `redact` no pino.
- Chave vazou → revogar e trocar; apagar o arquivo não basta.
- Variáveis `VITE_*` são públicas: nunca coloque segredo nelas.

## Dependências
- Lockfile commitado; adicionar dependência só com motivo no PR.
- Dependabot e CodeQL ativos; alerta high/critical tratado antes do próximo deploy.

## Headers
`@fastify/helmet` na API; na Vercel, headers básicos (`X-Content-Type-Options`, `Referrer-Policy`).

## Revisão
PR que toca autenticação, autorização, pagamento ou segredos é sempre **Ask** (revisão do colega obrigatória).
