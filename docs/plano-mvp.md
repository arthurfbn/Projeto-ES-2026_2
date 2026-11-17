# Plano do MVP — 3 semanas (16/11 → 06/12/2026)

> Apresentação ao vivo em **07/12/2026**: sistema rodando + como foi desenvolvido. O fim de semana 05–06/12 é só para retoques, não para features.
> Cada item abaixo vira uma ou mais issues em fatias verticais (skill `spec-e-tickets`). Arthur e Bruno pegam fatias alternadas; todo PR "Ask" é revisado pelo outro.

## Prioridades (MoSCoW)
- **Must:** contas e perfis, barbearia/serviços/vínculos/disponibilidade, horários livres, agendamento sem conflito, agenda do barbeiro, pagamento online e no local, cancelamento com política, comissões (3 tipos), painel do barbeiro, painel do gerente por barbearia, deploy com CI.
- **Should:** cobrança em aberto com restrição global, bloqueio manual por barbeiro/gerente, avaliações, painel geral do gerente (todas as barbearias).
- **Could:** contestação de pagamento presencial, filtro dos painéis por cliente, PWA instalável.
- **Won't (agora):** fidelidade/promoções, notificações, app nativo (ADR-0010).

**Linha de corte:** se ao fim da semana 2 os Must da semana 2 não estiverem em produção, os Could saem e os Should são revistos.

## Semana 1 (16–22/11) — Documentação, fundação e cadastro
- **Incremento 1:** documentação no repositório (README, CLAUDE.md, ADRs, CONTEXT, ODS, skills, template de PR).
- Revisão das regras com o Bruno (CONTEXT.md e ADRs 0011–0014) e grill pontual se surgir ambiguidade na implementação.
- Scaffold do monorepo (pnpm, web, api, contracts), lint/typecheck/Vitest, CI no GitHub Actions, proteção da `main`.
- Infra gratuita (ADR-0015): Neon (Postgres), Render (API), Vercel (web) com preview por PR e proxy `/api`, Sentry.
- Schema completo (Prisma + constraints) e seed.
- Fatias: cadastro/login com sessão; `/me` com perfis e troca de visão; gerente cria barbearia, serviços (preço e duração padrão), adiciona gerentes e cria vínculos de barbeiros com preço/duração por barbeiro; barbeiro define disponibilidade.
- **Demo da semana:** gerente monta uma barbearia em produção.

## Semana 2 (23–29/11) — Agenda e pagamento
- Horários livres (core + TDD): passo de 15 min, duração do serviço do barbeiro, sem conflito entre barbearias.
- Cliente agenda escolhendo pagar online ou no local (ADR-0013; constraint EXCLUDE no banco) e vê seus agendamentos.
- Agenda do barbeiro e do gerente; transições de status (confirmar, iniciar, concluir, não compareceu).
- Pagamento online (Stripe Checkout + webhook idempotente) e registro de pagamento presencial.
- Comissões: regras percentual/fixa/escalonada marginal (ADR-0014) e lançamento ao concluir + pagar.
- **Demo da semana:** agendar, pagar e concluir um atendimento.

## Semana 3 (30/11–06/12) — Proteção da renda, painel e qualidade
- Cancelamento com política (core + reembolso parcial Stripe).
- Cobrança em aberto + restrição global de agendamento (cai na quitação); bloqueio manual por barbeiro/gerente (persiste até desbloqueio, com indicação de quitação).
- Avaliações.
- Painel do barbeiro: faturamento gerado, comissão, gorjetas, margem, ticket médio, média de avaliações, serviços mais bem avaliados; filtros por período e barbearia (cliente se der tempo).
- Painel do gerente: por barbearia (faturamento, resultado, margem, comissões por barbeiro, cancelamentos, não comparecimentos) e geral.
- Contestação (se couber).
- E2E Playwright das jornadas críticas; revisão de autorização em todas as rotas.
- Métricas para a apresentação: DORA do período, SLO, cobertura das regras.
- README final, diagrama de arquitetura, roteiro da demo, dados de seed para apresentação.
- **Congelamento de features: quinta 04/12.**

## Roteiro da apresentação (rascunho)
1. Problema e ODS 8 → 2. Demo ao vivo (gerente → cliente agenda e paga → barbeiro conclui → cancelamento tardio → painel do barbeiro) → 3. Como foi feito: grill/CONTEXT/ADRs, fatias verticais, TDD, CI/CD, IA com skills → 4. Métricas → 5. Próximos passos (app, fidelidade).
