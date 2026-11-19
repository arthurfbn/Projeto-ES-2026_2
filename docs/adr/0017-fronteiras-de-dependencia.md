# 0017 — Fronteiras de dependência: serviços externos atrás de portas

- **Status:** aceito
- **Data:** 2026-11-19

## Contexto
Em quatro dias a hospedagem mudou duas vezes (Railway → Render/Neon → Railway) sem tocar em código, porque a aplicação só conhece variáveis de ambiente. Queremos a mesma propriedade para todo serviço externo: trocar um fornecedor deve ser uma mudança pontual — um adapter novo e configuração — sem alterar regra de negócio nem schema.

## Decisão
1. **Todo serviço externo entra por uma porta** (interface definida por quem usa) e um **adapter** que a implementa. Serviço externo = algo fora do nosso código que pode cobrar, sair do ar, mudar de plano ou ser trocado.

   | Serviço | Porta | Adapter atual | Onde |
   |---|---|---|---|
   | Pagamentos | `PaymentGateway` | Stripe | `modules/pagamentos/adapters/` |
   | Eventos de pagamento (webhook) | `PaymentEventParser` | Stripe | `modules/pagamentos/adapters/` |
   | Persistência | repositórios por módulo | Prisma + Postgres | `modules/*/adapters/` |
   | Erros | `ErrorReporter` | Sentry (ou console) | `shared/observability/` |
   | Relógio | `Clock` | sistema | `shared/` |
   | Hospedagem | variáveis de ambiente | Railway, Vercel | config |

2. **Nomes neutros no domínio e no banco.** Nada de `stripe_*`: usar `provider`, `provider_event_id`, `provider_session_id`, `provider_payment_id`.
3. **Webhook genérico:** `POST /webhooks/payments/:provider`. O adapter valida a assinatura e traduz o evento do fornecedor para um evento do domínio (`PaymentSucceeded`, `PaymentExpired`, `RefundSucceeded`); o caso de uso só conhece o evento do domínio.
4. **Seleção por configuração:** a composição (`apps/api/src/app.ts`) escolhe o adapter conforme variáveis de ambiente (ex.: sem `SENTRY_DSN`, usa o `ConsoleErrorReporter`). Testes usam fakes das portas.
5. **Lint como guarda:** `no-restricted-imports` proíbe SDKs de fornecedor (`stripe`, `@sentry/*`, `@prisma/client`, `pg`) fora de `adapters/`, `shared/observability/`, `shared/db/` e da composição. O CI falha se a regra for violada.

## O que fica acoplado de propósito
- **PostgreSQL** como tipo de banco: as garantias de integridade (constraint `EXCLUDE` contra horários sobrepostos) valem mais que portabilidade de SGBD. O provedor de Postgres é trocável; o SGBD não (ADR-0004).
- **Bibliotecas de código** (Vue, Fastify, Zod, TanStack Query, Prisma como ferramenta de migration): abstraí-las seria abstração especulativa. Elas são escolhas de stack, trocadas só por ADR.

## Consequências
- Trocar o gateway de pagamento = novo adapter de `PaymentGateway` + `PaymentEventParser` + variáveis; nenhuma migration.
- Um pouco mais de código de composição no início, já entregue no scaffold.
- Revisão de PR checa: entrou SDK novo? Está atrás de porta?
