# 0010 — Limites de robustez do MVP

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
Três semanas de desenvolvimento (16/11 a 06/12/2026, apresentação ao vivo em 07/12), duas pessoas, apoio total de IA. O objetivo é um MVP completo e bem engenhado, não uma plataforma pronta para escala.

## Decisão
**Dentro:** monólito modular, Postgres com constraints, testes em pirâmide, CI com gates, preview por PR, logs estruturados (pino), captura de erros (Sentry free) e health check, Stripe em modo teste.

**Fora (até uma métrica justificar, via novo ADR):**
- Redis, filas e jobs em segundo plano (lembretes ficam fora ou síncronos)
- OpenTelemetry/Grafana, tracing distribuído
- Row Level Security no Postgres
- Microsserviços, Kubernetes, GraphQL, SSR/Nuxt
- App nativo (só PWA)
- Ambientes de PR do Railway com banco próprio
- Multi-idioma, multi-moeda
- Fidelidade e promoções (existiam no projPOO; voltam depois do MVP)
- Notificações por e-mail/WhatsApp

**Observabilidade mínima:** logs JSON com `requestId`, `GET /health`, Sentry na web e API, e um SLO declarado: 95% das criações de agendamento em < 500 ms.

## Consequências
- Qualquer proposta (humana ou de IA) que traga itens da lista "fora" deve ser recusada ou virar ADR.
