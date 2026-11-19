# 0016 — API e banco de volta ao Railway (conta do Bruno, trial gratuito)

- **Status:** aceito — substitui a escolha de Render e Neon do ADR-0015. O restante do ADR-0015 continua valendo: custo zero, sem domínio próprio, front na Vercel com proxy `/api`.
- **Data:** 2026-11-19

## Contexto
O ADR-0015 trocou o Railway por Render + Neon porque o trial da conta do Arthur tinha acabado. A conta do Bruno ainda tem o trial gratuito do Railway e conseguiu acessar o repositório no GitHub. O Railway era a escolha original (ADR-0004) e evita a hibernação do Render, que atrapalharia a demo ao vivo.

## Decisão
| Peça | Serviço | Conta |
|---|---|---|
| API | Railway (trial gratuito) | Bruno |
| Banco | Railway Postgres (mesmo projeto da API) | Bruno |
| Web | Vercel Hobby, com proxy `/api/*` → URL pública da API no Railway | Arthur |
| Pagamentos, erros | Stripe (modo teste), Sentry | Arthur |

- O cookie de sessão continua first-party via proxy da Vercel (ADR-0015); a API fica em `*.up.railway.app`.
- `DATABASE_URL` da API referencia o Postgres do mesmo projeto (`${{Postgres.DATABASE_URL}}`); migrations rodam no deploy (`prisma migrate deploy`).
- Arthur é convidado como membro do projeto no Railway, se o plano permitir; senão, Bruno é o dono do deploy da API.

## Riscos e plano B
- O trial do Railway dura **30 dias ou US$ 5 de uso**, o que acabar primeiro; depois sobra US$ 1/mês, insuficiente para API + banco. Bruno anota a data de início do trial e acompanhamos o uso em **Usage** toda semana. Se a data de fim cair antes de 07/12, ou o crédito estiver perto de acabar, aplicamos o plano B com antecedência.
- **Plano B (sem custo):** voltar ao ADR-0015 — Neon para o banco e Render para a API. Como tudo passa por variáveis de ambiente e pelo rewrite da Vercel, a troca é configuração, não código. Exportar os dados com `pg_dump` antes de o trial expirar.

## Consequências
- Sem hibernação da API durante o trial (melhor para a demo).
- Dependência da conta pessoal do Bruno para a API: segredos da API ficam no Railway, com cópia no gerenciador de senhas da dupla.
