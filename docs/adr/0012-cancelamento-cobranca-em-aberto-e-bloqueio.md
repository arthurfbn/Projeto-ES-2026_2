# 0012 — Cancelamento, cobrança em aberto e bloqueio

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Cancelamentos tardios e não comparecimentos são prejuízo direto do barbeiro (ODS 8, meta 8.5). O pagamento pode ser antecipado (online) ou no local, e o sistema precisa cobrar também quem não pagou antes.

## Decisão
- Política implementada como função pura no core: `refundablePercentage({ startsAt, bookedAt, cancelledAt, cancelledBy })`.
  - Cancelado por barbeiro, gerente ou expiração do pagamento: 100%.
  - Cliente, ≥ 24h antes: 100%.
  - Cliente, agendamento feito com ≥ 24h de antecedência: 24h–12h → 75%; 12h–6h → 50%; 6h–1h → 25%; ≤ 1h → 0%.
  - Cliente, agendamento feito com < 24h de antecedência: mais de 1h antes → 100%; ≤ 1h → 0%.
  - Não comparecimento (status próprio `no_show`, só a partir de `confirmed`): 0%.
- Limites das faixas: "≥ 24h" inclusivo; "≤ 1h" inclusivo; demais intervalos fechados no limite superior.
- **Pago online e cancelado:** reembolso parcial via Stripe da parte recuperável.
- **Não pago e cancelado / não compareceu:** **cobrança em aberto** com a parte não recuperável do preço congelado.
- **Restrição por inadimplência** (automática): cliente com cobrança em aberto não agenda em nenhuma barbearia; cai imediatamente na quitação.
- **Bloqueio** (manual): barbeiro (para si) ou gerente (para a barbearia) pode bloquear um cliente que tenha cobrança em aberto. O bloqueio persiste após a quitação até ser desfeito manualmente; a lista de bloqueios exibe "cobrança quitada em <data>" quando for o caso (indicação na tela, sem notificação push/e-mail — ADR-0010).
- **Contestação** de pagamento presencial: decidida por um gerente da barbearia.

## Alternativas
- Taxa fixa de cancelamento: mais simples, menos justa.
- Exigir pagamento antecipado sempre: elimina cobrança em aberto, mas reduz adesão de quem recebe no local.

## Consequências
- Reembolso parcial entra no escopo (ADR-0007).
- O caso de uso de agendamento checa cobrança em aberto do cliente.
- A política é coberta por testes de tabela (cada faixa e cada limite).
