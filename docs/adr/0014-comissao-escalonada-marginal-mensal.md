# 0014 — Comissão escalonada marginal sobre o faturamento mensal

- **Status:** aceito
- **Data:** 2026-11-15

## Contexto
O modelo de dados prevê comissão percentual, fixa e escalonada. A escalonada precisa de base e forma de aplicação claras, porque comissão mal definida é exatamente a informalidade que a ODS 8 quer combater.

## Decisão
- Base: **faturamento do barbeiro naquela barbearia no mês civil** (fuso America/Sao_Paulo), sem gorjetas.
- Aplicação **marginal**: cada parte do faturamento recebe o percentual da faixa em que cai (como imposto de renda). Ex.: faixas 40% até R$ 3.000 e 50% acima; com R$ 3.500 no mês, comissão = 0,40 × 3.000 + 0,50 × 500.
- Cálculo **incremental por atendimento**: ao concluir e pagar um agendamento, o core recebe o faturamento acumulado do mês antes dele e calcula a comissão só da parte nova, dividindo-a entre faixas se cruzar um limite. Soma dos lançamentos = comissão marginal do mês, sem fechamento mensal nem job.
- Função pura `tieredCommission({ tiers, monthToDateCents, amountCents })`.
- Estorno de agendamento já comissionado gera lançamento negativo (não recalcula o mês).

## Alternativas
- Faixa aplicada ao mês inteiro ("salto"): incentiva disputas perto do limite e exige recalcular lançamentos anteriores.
- Fechamento mensal: exige job e deixa o painel desatualizado durante o mês.

## Consequências
- O barbeiro vê a comissão atualizada a cada atendimento (transparência, meta 8.5).
- Testes de tabela cobrem: dentro de uma faixa, cruzando um limite, cruzando dois limites, virada de mês.
