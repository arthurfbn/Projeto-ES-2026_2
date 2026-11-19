# 0004 — PostgreSQL no Railway com Prisma

- **Status:** aceito; hospedagem revista nos ADRs 0015 e 0016 (Railway Postgres na conta do Bruno; Neon como plano B). Regras de modelagem e migrations continuam valendo.
- **Data:** 2026-11-15

## Contexto
O projPOO usava SQLite/Turso. O modelo da disciplina de BD foi escrito para Postgres e precisamos de garantias que só o Postgres dá (ex.: impedir agendamentos sobrepostos no próprio banco). A dupla já conhece Prisma.

## Decisão
- PostgreSQL gerenciado no Railway, no mesmo projeto da API.
- Prisma como ORM e ferramenta de migrations. O que o Prisma não expressa entra como SQL manual dentro da migration:
  - `btree_gist` + `EXCLUDE USING gist (barber_user_id WITH =, period WITH &&) WHERE (status in ativos)` contra conflito de horário.
  - `CHECK` constraints de domínio.
- `timestamptz` em todas as datas; dinheiro em centavos (`integer`).
- Toda tabela de negócio carrega `barbershop_id`.
- Migrations rodam no deploy da API (`prisma migrate deploy`) e seguem expand/contract.

## Alternativas
- Neon (branch de banco por PR) e Supabase: bons, mas adicionam outro provedor; Railway centraliza.
- Drizzle: mais próximo de SQL, mas curva de aprendizado no prazo.

## Consequências
- Integração em CI usa um Postgres de serviço no GitHub Actions, rodando as mesmas migrations.
- `prisma db push` é proibido fora de experimentos locais.
