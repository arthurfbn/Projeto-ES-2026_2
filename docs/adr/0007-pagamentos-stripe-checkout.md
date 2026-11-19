# 0007 — Pagamentos com Stripe Checkout em modo teste

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Queremos simular pagamento real sem custo, e a dupla nunca integrou um gateway.

## Decisão
- Stripe Checkout hospedado, sempre com chaves de teste (`sk_test_...`).
- Nomes neutros e webhook genérico conforme ADR-0017 (`/webhooks/payments/:provider`, `provider_event_id`).
- Fluxo: API cria Checkout Session para um agendamento → cliente paga na página do Stripe → Stripe chama o webhook `/webhooks/payments/stripe` → API confirma o pagamento.
- O webhook é a fonte da verdade (nunca a página de sucesso).
- Webhook valida assinatura e é idempotente: tabela `payment_events` com `(provider, provider_event_id)` único (ADR-0017).
- Cartão primeiro. Pix pode ser adicionado como segundo método na mesma sessão se a conta Stripe for brasileira.
- O módulo `pagamentos` expõe um port `PaymentGateway`; o Stripe é um adapter.
- **Pagamento presencial** (dinheiro, cartão ou Pix na barbearia) também é registrado, com `provider = 'manual'`, por barbeiro ou gerente. Todo pagamento existe no sistema.
- **Reembolso parcial** via Stripe Refunds entra no escopo (política de cancelamento, ADR-0012).
- Cobranças em aberto podem ser quitadas online pelo mesmo fluxo de Checkout.

## Alternativas
- Mercado Pago / Asaas sandbox: Pix nativo, documentação e ferramentas de teste menos amigáveis.
- Formulário de cartão próprio (Elements): mais controle, mais complexidade.

## Consequências
- Nenhum dado de cartão passa pela nossa API.
- Desenvolvimento local precisa da Stripe CLI (`stripe listen`).
