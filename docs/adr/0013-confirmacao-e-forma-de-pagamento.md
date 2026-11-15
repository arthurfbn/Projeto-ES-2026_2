# 0013 — Confirmação do agendamento conforme a forma de pagamento

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
O cliente pode pagar no app ou no momento do serviço (dinheiro, cartão ou Pix presencial). Precisamos definir quando o horário está garantido sem criar atrito para o cliente nem trabalho extra para o barbeiro.

## Decisão
- Ao agendar, o cliente escolhe a **forma de pagamento**: `online` ou `no local`.
- **Online:** o agendamento nasce `pendente` e já reserva o horário. Uma Checkout Session do Stripe é criada com expiração de 30 minutos. Webhook `checkout.session.completed` → `confirmado`. Webhook `checkout.session.expired` → `cancelado` (por expiração, sem custo). Não é preciso job agendado: o próprio Stripe avisa a expiração.
- **No local:** o agendamento nasce `confirmado` direto, sem aceite do barbeiro. A proteção do barbeiro é a política de cancelamento + cobrança em aberto (ADR-0012).
- O pagamento no local é registrado pelo barbeiro ou gerente ao concluir o atendimento; o cliente pode contestar se não for reconhecido.
- Cliente com cobrança em aberto não consegue agendar de nenhuma forma.

## Alternativas
- Barbeiro aceita cada agendamento: mais controle, mas atrito e agendamentos parados sem resposta.
- Exigir pagamento online sempre: menos inadimplência, mas exclui quem paga em dinheiro.

## Consequências
- A constraint de sobreposição no banco considera `pending`, `confirmed` e `in_progress` como ocupando o horário.
- Métricas distinguem cancelamento por expiração de pagamento dos demais.
