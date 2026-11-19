# 0015 — Hospedagem 100% gratuita (Vercel + Render + Neon), sem domínio próprio

- **Status:** aceito — substitui a parte de hospedagem dos ADRs 0004, 0006 e 0009. **API e banco substituídos pelo ADR-0016** (Railway na conta do Bruno); Render + Neon passam a ser o plano B.
- **Data:** 2026-11-16

## Contexto
- **Domínio próprio não é prioridade agora.** O objetivo continua sendo um sistema comercial, mas com 3 semanas até a apresentação (07/12) o esforço vai para funcionalidade, testes e entrega. Registrar e configurar domínio, DNS e marca fica para depois do MVP, junto com a validação comercial.
- **O trial do Railway da conta do Arthur acabou.** Depois do trial, o Railway oferece só US$ 1/mês de crédito, insuficiente para manter API + Postgres no ar. Em vez de assinar um plano pago, optamos por serviços gratuitos para o MVP. Sem domínio próprio, front e API ficam em domínios diferentes (`*.vercel.app` e `*.onrender.com`), e navegadores bloqueiam cookies de terceiros — o que quebraria a sessão por cookie (ADR-0006).

## Decisão
| Peça | Serviço (plano gratuito) |
|---|---|
| Web | **Vercel** Hobby (`shavey.vercel.app` ou similar), preview por PR |
| API | **Render** Free Web Service (`shavey-api.onrender.com`), deploy automático da `main` |
| Banco | **Neon** Free (Postgres serverless, sem prazo de expiração) |
| Erros | Sentry Developer (gratuito) |
| CI | GitHub Actions (gratuito em repositório público) |
| Pagamentos | Stripe em modo teste |

- **Mesma origem via proxy da Vercel:** `apps/web/vercel.json` reescreve `/api/*` para a API no Render. O navegador só fala com `shavey.vercel.app`, então o cookie de sessão é *first-party*: `httpOnly; Secure; SameSite=Lax`, sem atributo `Domain`, e sem CORS em produção. Em desenvolvimento, o proxy do Vite faz o mesmo papel.
- O webhook do Stripe chama a API direto no Render (`https://shavey-api.onrender.com/webhooks/stripe`); não usa cookie.
- **Hibernação do Render:** o serviço gratuito dorme após 15 min sem tráfego e leva cerca de 1 min para acordar. Mitigações: tela de "acordando o servidor" no front quando `/api/health` demora; abrir o sistema alguns minutos antes da apresentação; webhooks perdidos durante a hibernação são reenviados automaticamente pelo Stripe.
- Migrations rodam no build do Render (`prisma migrate deploy`) usando a URL **direta** do Neon; a aplicação usa a URL **pooled**.
- Integração no CI continua com Postgres de serviço do GitHub Actions (não consome o Neon).

## Alternativas
- Railway Hobby (US$ 5/mês): sem hibernação, tudo num lugar — descartado pelo custo.
- Render Postgres Free: expira após 30 dias — descartado.
- Supabase Free: pausa após inatividade e traz recursos que não usaremos.
- Fly.io / Koyeb: exigem cartão ou têm free tier instável.
- Domínio próprio (~R$ 40/ano): resolveria cookies com `api.` subdomínio, mas tem custo; o proxy da Vercel resolve sem ele.

## Consequências
- Ponto de atenção comercial: o plano Hobby da Vercel é para uso não comercial; antes de virar produto, migrar para plano pago ou outro host (novo ADR).
- Trocar de host da API no futuro só muda a URL do rewrite e as variáveis de ambiente.
- Primeiro acesso após inatividade é lento; não serve como métrica do SLO (medir com o serviço acordado).
