# 0011 — Usuário único com perfis por barbearia

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Uma mesma pessoa pode ser cliente em qualquer barbearia, barbeiro em uma ou mais e gerente de outra (ou da mesma). O DDL da disciplina de BD tinha `users.role` global, que não representa isso. Não existe perfil de recepcionista.

## Decisão
- Uma conta (`users`) por pessoa, sem papel global.
- Todo usuário é **cliente** por padrão.
- Perfis por barbearia em tabelas de vínculo: `barbershop_managers (user_id, barbershop_id)` e `barber_memberships (user_id, barbershop_id, ...)`.
- Quem cria uma barbearia vira gerente dela. Barbeiro sem barbearia não existe: quem trabalha sozinho cria a própria barbearia e é gerente e barbeiro.
- A interface tem **visões** (cliente, barbeiro, gerente) com seletor de barbearia; o backend autoriza por vínculo, nunca pela visão escolhida no front.

## Alternativas
- Papel global (projPOO/DDL): simples, mas obriga contas duplicadas.
- Tabela única `barbershop_roles` com enum: possível; preferimos tabelas separadas porque o vínculo do barbeiro tem atributos próprios (turno, exclusividade, aceitando agendamentos).

## Consequências
- `GET /me` retorna os vínculos para o front montar as visões.
- Autorização sempre consulta o vínculo (skill `seguranca-authz`).
