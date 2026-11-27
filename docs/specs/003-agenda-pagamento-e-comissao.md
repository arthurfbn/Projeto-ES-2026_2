# 003 — Agenda, pagamento e comissão (semana 2)

## Objetivo / outcome
O cliente acha uma barbearia, agenda um serviço (com um barbeiro ou com "qualquer barbeiro"), paga online ou no local, e o atendimento é concluído com a comissão do barbeiro lançada. Sabemos que funcionou quando a demo da semana mostra, no site em produção: busca → página da barbearia → agendar → pagar (Stripe de teste ou no local) → barbeiro inicia e conclui → lançamento de comissão na página do vínculo.

## Conceitos do domínio
Busca, Barbearia agendável, Página da barbearia, Recentes, Agenda, Horário livre, Qualquer barbeiro, Agendamento, Status do agendamento, Pagamento, Gorjeta, Regra de comissão, Comissão escalonada, Lançamento de comissão (`docs/CONTEXT.md`; ADR-0007, ADR-0013, ADR-0014, ADR-0022, ADR-0023).

## Regras de negócio
**Descoberta (só para quem entrou; ADR-0022)**
- R1. A busca acha **barbearias agendáveis** por nome, bairro ou cidade, sem diferenciar maiúsculas nem acentos.
- R2. Abaixo da busca, chips com os nomes dos serviços ativos de barbearias agendáveis, agrupados pelo nome normalizado. Tocar num chip lista as barbearias que oferecem aquele serviço.
- R3. A **página da barbearia** mostra endereço e serviços agendáveis; para cada serviço, os barbeiros que o realizam, com o preço e a duração deles (próprios ou padrão, R16 da spec 001).
- R4. **Recentes**: barbearias onde o cliente já agendou, da mais recente para a mais antiga.

**Horários livres**
- R5. Horário livre de um barbeiro para um serviço: início em múltiplo de 15 min, dentro de uma janela de disponibilidade vigente naquele dia (hora de São Paulo), cabendo a duração inteira do serviço do barbeiro, sem sobrepor agendamento ativo (pendente, confirmado ou em atendimento) do barbeiro em **qualquer** barbearia.
- R6. Só entre 30 minutos a partir de agora e 30 dias à frente.
- R7. Só barbeiro com vínculo ativo, aceitando agendamentos, que realiza o serviço, e só serviço ativo.
- R8. **Qualquer barbeiro**: a lista é a união dos horários livres dos barbeiros que realizam o serviço; quando os preços diferem, aparece "a partir de R$ X". Ao escolher, o sistema atribui o barbeiro livre com menos agendamentos (pendente, confirmado, em atendimento ou concluído) naquele dia, naquela barbearia; empate → menor preço; depois, ordem alfabética. Nome e preço aparecem antes de confirmar (ADR-0023).

**Agendamento**
- R9. O agendamento guarda cliente, barbearia, barbeiro, serviço, início e fim, **preço e duração congelados** e a forma de pagamento escolhida (online ou no local).
- R10. **No local**: nasce `confirmado` (ADR-0013). **Online**: nasce `pendente`, segura o horário e vai ao Stripe Checkout com expiração de 30 min; pago → `confirmado`; expirado → `cancelado` por expiração, sem custo (ADR-0013).
- R11. Dois agendamentos ativos do mesmo barbeiro nunca se sobrepõem, em nenhuma barbearia: garantido no banco (EXCLUDE), além do core. Se o horário foi tomado entre a lista e a confirmação, erro "horário não está mais livre".
- R12. O cliente vê seus agendamentos na **Agenda** (navbar) e em "Meus agendamentos" (Início). A Agenda também mostra os que ele atende como barbeiro, com diferença visual nítida entre os dois.

**Atendimento (barbeiro do agendamento ou gerente da barbearia)**
- R13. **Iniciar**: só `confirmado`, a partir de 15 min antes do início. **Concluir**: só `em atendimento`. **Não compareceu**: só `confirmado`, depois do horário de início. `pendente` não é iniciado. O cliente não muda o estado na semana 2 (cancelamento é semana 3).
- R14. Agendamento **no local** só é concluído registrando o pagamento: forma (dinheiro, cartão ou Pix), valor = preço congelado (sem desconto) e gorjeta opcional.
- R15. O gerente vê a agenda da barbearia (todos os barbeiros) na Gestão; o barbeiro vê a sua na Agenda.

**Pagamento online**
- R16. Antes de ir ao Stripe, o cliente pode informar gorjeta (opcional, ≥ 0). O Checkout cobra preço congelado + gorjeta; o pagamento guarda os dois valores separados (ADR-0023).
- R17. O webhook é a fonte da verdade e é idempotente por `(provider, provider_event_id)` (ADR-0007, ADR-0017).

**Comissão**
- R18. O gerente cadastra regras no vínculo: percentual (0–100%), fixa (centavos por atendimento) ou escalonada (faixas com limite em centavos e percentual); geral ou por serviço; vigência com início obrigatório e fim opcional; sem sobrepor regra do mesmo escopo.
- R19. Ao concluir **e** pagar um atendimento, nasce um lançamento de comissão: vale a regra do serviço vigente na data do atendimento; senão, a geral. Base = preço congelado (sem gorjeta). Escalonada geral: faixas sobre o faturamento do mês do barbeiro na barbearia (todos os serviços); por serviço: só daquele serviço; cálculo marginal e incremental (ADR-0014).
- R20. Sem regra vigente: lançamento de valor zero marcado "sem regra".
- R21. Barbeiro vê os lançamentos do mês e os totais (comissão e gorjetas) na página do vínculo; o gerente, o mesmo por barbeiro na Equipe.

## Critérios de aceite
- CA1 (R1) Given barbearia "Navalha" em Bela Vista, São Paulo, com barbeiro agendável, When busco "bela vista" ou "navalha", Then ela aparece; Given barbearia sem barbeiro aceitando agendamentos, Then não aparece.
- CA2 (R2) Given "Corte" na Navalha e "corte" na Capital, When toco no chip "Corte", Then vejo as duas.
- CA3 (R3) Given Léo faz Corte por R$ 50 (próprio) e Bia por R$ 40 (padrão), When abro a Navalha, Then o Corte mostra Léo R$ 50 e Bia R$ 40.
- CA4 (R5, R7) Given disponibilidade seg 09:00–12:00 e Corte de 30 min, When peço os horários de segunda, Then vejo 09:00…11:30 de 15 em 15; Given agendamento 10:00–10:30 do mesmo barbeiro em outra barbearia, Then 09:45, 10:00 e 10:15 somem.
- CA5 (R6) Given agora 14:10, When peço os horários de hoje, Then o primeiro é 14:45; e nada depois de 30 dias.
- CA6 (R8) Given Léo e Bia livres às 10:00 e Léo com 2 agendamentos no dia contra 1 da Bia, When escolho "qualquer barbeiro" às 10:00, Then Bia é atribuída e vejo o preço dela antes de confirmar.
- CA7 (R9, R10) Given horário livre, When agendo pagando no local, Then o agendamento nasce confirmado com preço e duração congelados; When o gerente muda o preço depois, Then o agendamento mantém o preço antigo.
- CA8 (R11) Given dois clientes no mesmo horário do mesmo barbeiro, When ambos confirmam, Then um agenda e o outro recebe "horário não está mais livre".
- CA9 (R12) Given Zé é cliente na Capital e barbeiro na Navalha, When abre a Agenda, Then vê os dois, distinguidos como "cliente" e "atendendo".
- CA10 (R13) Given confirmado às 10:00, When o barbeiro inicia às 09:40, Then erro; às 09:45, Then em atendimento; When marca não compareceu antes das 10:00, Then erro.
- CA11 (R14) Given em atendimento pago no local, When conclui sem informar a forma, Then erro; When informa Pix e gorjeta R$ 5, Then concluído com pagamento de preço congelado + gorjeta.
- CA12 (R10, R16, R17) Given agendamento online com gorjeta R$ 5, When o Stripe confirma, Then confirmado e pagamento com preço e gorjeta separados; When o mesmo evento chega de novo, Then nada muda; When a sessão expira, Then cancelado por expiração e o horário volta a ficar livre.
- CA13 (R18) Given regra geral de 40% vigente, When o gerente cria outra geral com vigência que se cruza, Then erro.
- CA14 (R19) Given regra por serviço "Corte" fixa R$ 15 e geral 40%, When conclui e paga um Corte de R$ 50 e uma Barba de R$ 30, Then lançamentos de R$ 15 e R$ 12.
- CA15 (R19) Given geral escalonada 40% até R$ 3.000 e 50% acima, faturamento do mês R$ 2.900, When conclui e paga R$ 200, Then comissão = 0,40 × 100 + 0,50 × 100 = R$ 90.
- CA16 (R20) Given vínculo sem regra, When conclui e paga, Then lançamento de R$ 0 marcado "sem regra".
- CA17 (R21) Given lançamentos no mês, When o barbeiro abre a página do vínculo, Then vê cada lançamento e os totais de comissão e gorjeta.

## Fora de escopo
Cancelamento pelo cliente, barbeiro ou gerente, reembolso, cobrança em aberto, bloqueio e contestação (semana 3); remarcação; fechamento de agenda e diária; favoritos; ofertas; Painel com indicadores; avisos; Pix no Stripe; visitante sem conta buscando ou agendando; e-mail.

## Restrições
- Horários livres, atribuição de "qualquer barbeiro", transições de estado e cálculo de comissão no core, com TDD e tempo por parâmetro (`Clock`). Datas no banco em UTC; dias e horários em `America/Sao_Paulo`.
- EXCLUDE no banco para agendamentos ativos do mesmo barbeiro (skill `banco-migrations`).
- Stripe só por porta + adapter, chaves de teste, webhook com assinatura e idempotência (skill `pagamentos-stripe`, ADR-0017).
- Toda rota de agendamento escopada: cliente só vê os próprios; barbeiro e gerente só os da barbearia/vínculo (skill `seguranca-authz`).
- **Divisão:** as fatias do Bruno não dependem das do Arthur; as do Arthur podem depender das do Bruno.

## Seed da demo
Cada fatia acrescenta à seed (`apps/api/prisma/seed.ts`) o que a demo precisa: barbearias agendáveis com disponibilidade, agendamentos de exemplo, regras de comissão.

## Perguntas em aberto
Nenhuma.

## Tickets
**Bruno** (não dependem do Arthur):
- #43 horários livres do barbeiro e de "qualquer barbeiro" (R5–R8)
- #44 busca, serviços da plataforma e página da barbearia + seed base (R1–R3) — depende de #43
- #45 cliente agenda pagando no local (R9–R11) — depende de #43, #44
- #46 Agenda na navbar, Meus agendamentos e Recentes (R4, R12, R15) — depende de #45
- #47 iniciar, concluir e não compareceu, com pagamento no local (R13, R14) — depende de #46

**Arthur** (podem depender do Bruno):
- #48 regras de comissão no vínculo (R18) — sem dependência, pode começar já
- #49 pagamento online com Stripe, gorjeta e expiração (R10, R16, R17) — depende de #45, #47
- #50 lançamento de comissão ao concluir e pagar (R19–R21) — depende de #48, #47, #49
