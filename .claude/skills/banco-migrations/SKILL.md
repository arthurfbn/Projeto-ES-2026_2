---
name: banco-migrations
description: Use ao criar ou alterar tabelas, colunas, índices, constraints, seeds ou queries Prisma — regras de modelagem Postgres, migrations expand/contract e SQL manual no Prisma.
---

# Banco: Postgres (Railway) + Prisma

## Modelagem
- PK `uuid` com `gen_random_uuid()`. Toda tabela de negócio tem `barbershop_id` (exceto `users` e `sessions`).
- Datas: `timestamptz` (`@db.Timestamptz`). Gravar UTC; nunca `timestamp` sem fuso.
- Dinheiro: `integer` em centavos (`price_cents`, `amount_cents`). Nunca float/decimal no código.
- `created_at` e `updated_at` (`@updatedAt`) em tabelas mutáveis.
- Enums de status como enum do Postgres via Prisma `enum`.
- Nomes de tabela/coluna em `snake_case` com `@@map`/`@map`; modelos Prisma em `PascalCase`.
- Papéis são por vínculo com a barbearia (owner/manager/barber), não um `role` global no usuário.
- Índices para toda consulta de agenda: `(barber_user_id, starts_at)`, `(barbershop_id, starts_at)`.

## Garantias no banco (não só no código)
O que é invariante de negócio vira constraint. Exemplo — sem sobreposição de agendamentos ativos do mesmo barbeiro:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (barber_user_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status IN ('pending', 'confirmed', 'in_progress'));
```
Também: `CHECK (ends_at > starts_at)`, `CHECK (rating BETWEEN 1 AND 5)`, `UNIQUE` onde o domínio exige.

## Fluxo de migration
1. Altere `schema.prisma`.
2. `pnpm prisma migrate dev --create-only --name <verbo_objeto>` (ex.: `add_appointment_no_overlap`).
3. Revise o SQL gerado; acrescente SQL manual (constraints, extensões) no mesmo arquivo.
4. `pnpm prisma migrate dev` para aplicar; rode `pnpm test:int`.
5. Nunca edite uma migration já mergeada na `main`: crie outra.

## Expand / contract (mudança sem quebrar deploy)
Renomear/remover coluna = 3 PRs: (1) **expand**: adiciona nova coluna e escreve nas duas; (2) migra dados e passa a ler da nova; (3) **contract**: remove a antiga. Nunca remova uma coluna no mesmo deploy que para de usá-la.

## Queries
- Repositórios Prisma sempre recebem `barbershopId` e filtram por ele.
- Use `select` explícito em listagens; evite N+1 (`include` ou query única).
- SQL cru (`$queryRaw`) só com tagged template (parametrizado). Nunca concatenação de string.
- Transação (`$transaction`) quando um caso de uso grava em mais de uma tabela.
- Violação de constraint (ex.: `23P01` exclusion, `23505` unique) é traduzida para erro de domínio no adapter.

## Seed
`apps/api/prisma/seed.ts` determinístico, inspirado no DML da disciplina de BD: algumas barbearias, barbeiros, serviços, disponibilidade e agendamentos. Contas de demo documentadas no README (nunca senhas reais).

## Não faça
- `prisma db push` em qualquer ambiente compartilhado.
- Apagar/alterar dados de produção manualmente sem registrar em `docs/incidentes.md`.
