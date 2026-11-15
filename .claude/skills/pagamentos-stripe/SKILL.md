---
name: pagamentos-stripe
description: Use ao implementar ou alterar qualquer fluxo de pagamento, estorno, webhook ou integração com o Stripe — Checkout em modo teste, webhook idempotente e port PaymentGateway.
---

# Pagamentos com Stripe Checkout (ADR-0007)

## Princípios
- Sempre chaves de **teste** (`sk_test_`, `whsec_` do CLI/Dashboard de teste). Se aparecer `sk_live_`, pare.
- Nenhum dado de cartão passa pela API: o cliente paga na página hospedada do Stripe.
- **O webhook é a fonte da verdade.** A página de sucesso só mostra "processando" e consulta o status na API.
- Stripe fica no adapter `modules/pagamentos/adapters/stripe-gateway.ts`, que implementa o port `PaymentGateway`. Core e casos de uso não importam `stripe`.

## Fluxo
1. Cliente escolhe pagar um agendamento → `POST /barbershops/:id/appointments/:aid/checkout`.
2. Caso de uso valida (agendamento é do cliente, status permite pagamento, sem pagamento pago existente), cria `payments` com status `pending` e chama `gateway.createCheckout({ amountCents, currency: 'brl', paymentId, successUrl, cancelUrl })`.
3. Adapter cria a Checkout Session com `metadata: { paymentId }`, `client_reference_id`, e `idempotencyKey` derivada do `paymentId`. Salva `provider_session_id`.
4. Resposta: URL do Checkout; web redireciona.
5. Stripe chama `POST /webhooks/stripe`:
   - Ler **corpo cru** (`rawBody`) e validar com `stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET`. Falhou → 400.
   - Inserir `stripe_event_id` em `payment_events` (UNIQUE). Se já existia → 200 sem fazer nada (idempotência).
   - `checkout.session.completed` (com `payment_status = 'paid'`) → pagamento `paid`, agendamento `confirmed`, na mesma transação.
   - `checkout.session.expired` → pagamento `expired`.
   - Responder 200 rápido; eventos desconhecidos → 200 e ignorar.

## Modelo
`payments`: `id, barbershop_id, appointment_id, provider ('stripe'|'manual'), provider_session_id, provider_payment_intent_id, amount_cents, tip_cents, currency, status (pending|paid|failed|expired|refunded), paid_at, created_at, updated_at`.
`payment_events`: `stripe_event_id UNIQUE, type, received_at`.

## Testes
- Core (regras de quando pode pagar/estornar): unidade.
- Webhook: integração assinando payloads com `stripe.webhooks.generateTestHeaderString`; testar evento duplicado e assinatura inválida.
- Fake de `PaymentGateway` nos testes de caso de uso.
- Manual: `stripe listen --forward-to localhost:3333/webhooks/stripe`, cartão `4242 4242 4242 4242` (aprovado) e `4000 0000 0000 0002` (recusado).

## Reembolso e cobranças (ADR-0012)
- Cancelamento de agendamento pago online → `stripe.refunds.create({ payment_intent, amount })` com o valor recuperável calculado pelo core (`refundablePercentage`). Idempotency key = id do cancelamento. Status final via webhook `charge.refunded`/`refund.updated`.
- Cobrança em aberto é quitada por Checkout Session própria (`metadata: { outstandingChargeId }`).
- Pagamento presencial: `provider = 'manual'`, registrado por barbeiro/gerente via rota própria; não passa pelo Stripe.

## Fora de escopo do MVP (salvo novo ADR)
Assinaturas, split para barbeiros (Connect). Pix só se a conta Stripe for brasileira e sobrar tempo.
