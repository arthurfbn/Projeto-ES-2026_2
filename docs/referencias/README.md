# Referências — modelo da disciplina de Banco de Dados

Material produzido na disciplina de BD (2026/2) que serviu de **inspiração inicial** para o Shavey. Fica aqui como registro histórico, **não como regra** e **não deve ser executado**.

| Arquivo | Conteúdo |
|---|---|
| `modelo-disciplina-bd.dbml` | Modelo conceitual inicial (DBML) |
| `ddl-disciplina-bd.sql` | DDL Postgres da disciplina |
| `seed-disciplina-bd.sql` | Seed com dados fictícios (≥ 20 linhas por tabela) |

O modelo atual nasce fatia a fatia nas migrations de `apps/api/prisma`, seguindo `docs/CONTEXT.md` e os ADRs.

## Onde o modelo da disciplina diverge das decisões atuais

| Modelo da disciplina | Decisão atual | Fonte |
|---|---|---|
| Papel global `user_role` (admin, barber, client) | Usuário único; barbeiro e gerente são perfis **por barbearia**; sem admin | ADR-0011 |
| `permission_level` com owner e receptionist | Só gerente (vários por barbearia); recepcionista não existe | ADR-0011 |
| Gerente adiciona o barbeiro direto | Entrada só por **convite aceito**, com exclusividade proposta no convite | ADR-0018 |
| `allowed_shift` como manhã/tarde/noite | Turno **opcional** em janelas semanais (dia, início, fim) | ADR-0018, ADR-0019 |
| Sem trabalho avulso | **Diária** por convite, sem vínculo | ADR-0019 |
| Dinheiro em `decimal` | Dinheiro em **centavos (int)** | CLAUDE.md |
| `timestamp` sem fuso | `timestamptz` (UTC), exibição em America/Sao_Paulo | CLAUDE.md |
| Endereço em texto livre | Endereço estruturado (CEP, rua, número, complemento, bairro, cidade, UF) | CONTEXT.md |
| `barber_services` sem duração própria | Preço **e** duração próprios opcionais | CONTEXT.md |
| Comissão escalonada com um único limite | Faixas com cálculo **marginal** mensal | ADR-0014 |
| Sem garantia de não sobreposição | Sem sobreposição de disponibilidade e de agendamento, também no banco (EXCLUDE) | CONTEXT.md |
| `payments` sem provedor, sem `barbershop_id`, sem `failed`/`expired` | Pagamento com `provider` neutro, escopado por barbearia, eventos idempotentes | ADR-0007, ADR-0013, ADR-0017 |

## Dados da seed que violam as regras atuais

| Problema | Exemplo | Regra |
|---|---|---|
| Disponibilidade sobreposta entre barbearias | Carlos Melo (`63df1456…`) e André Carvalho (`9bc72984…`) em 3 barbearias no mesmo horário | Disponibilidade não se sobrepõe |
| Disponibilidade fora do turno | Eduardo Lima (`27b3cf88…`): turno `morning`, atende 10:00–19:00 | Com turno, a disponibilidade cabe nele |
| Durações fora do passo de 15 min | 50, 25 e 40 min | Duração ≥ 15 e múltipla de 15 |
| `pending` no passado | Vários entre jul. e out./2026 | Pendente expira em 30 min (ADR-0013) |
| Concluído com pagamento `refunded` | `0adc7cdd…` | Estorno só vem de cancelamento |
| Cancelamento/não comparecimento sem cobrança | `no_show` sem pagamento | Cobrança em aberto (ADR-0012) |
| Escalonada apurada como percentual simples | `tiered` 60% até R$ 2.000 | Cálculo marginal (ADR-0014) |
| `password_hash` falso | `$2b$10$abc…` | Nenhuma conta da seed faz login |
| Slug com acento | `barão-10` | Slug fora do escopo atual |

A seed da demo (`apps/api/prisma/seed.ts`) reaproveita nomes, serviços, bios e comentários daqui, convertidos para as regras atuais (ver spec 001, seção "Seed da demo").
