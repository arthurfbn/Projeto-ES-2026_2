# 0023 — Agendamento com "qualquer barbeiro", gorjeta online e escopo da comissão

- **Status:** aceito (complementa o ADR-0013 e altera o ADR-0014)
- **Data:** 2026-11-25

## Contexto
A semana 2 abre a agenda para o cliente (spec 003). O ADR-0013 decidiu a forma de pagamento (online ou no local) e o ADR-0014, o cálculo da comissão escalonada, mas ficaram em aberto: se o cliente precisa escolher o barbeiro, quem recebe o atendimento quando ele não escolhe, se há gorjeta no pagamento online e como regras gerais e por serviço convivem.

## Decisão
- **Qualquer barbeiro:** o cliente pode agendar sem escolher o barbeiro. Vê os horários livres de todos os barbeiros que realizam o serviço e, ao escolher um horário, o sistema atribui o barbeiro livre com **menos agendamentos naquele dia, naquela barbearia** (pendente, confirmado, em atendimento ou concluído). Empate: menor preço para o cliente; depois, ordem alfabética do nome. Nome e preço aparecem antes de confirmar. Na lista, quando os preços diferem, aparece "a partir de R$ X".
- **Janela de agendamento:** horários livres entre 30 minutos a partir de agora e 30 dias à frente.
- **Gorjeta:** opcional nos dois caminhos. Online: informada antes do pagamento; o Stripe cobra preço congelado + gorjeta, e o pagamento guarda os dois valores separados. No local: registrada ao concluir. Nunca entra na base de comissão.
- **Regras de comissão:** percentual, fixa ou escalonada, cada uma **geral** ou **por serviço**, com vigência e sem sobrepor regra do mesmo escopo. Para um atendimento vale a regra do serviço, se houver; senão, a geral.
  - Escalonada **geral**: faixas sobre o faturamento do mês do barbeiro na barbearia, contando **todos** os serviços (como no ADR-0014).
  - Escalonada **por serviço**: faixas sobre o faturamento do mês só daquele serviço.
- **Sem regra vigente:** o lançamento sai com valor zero e a marca "sem regra"; não trava o atendimento. Criar a regra depois não recalcula o passado.

## Alternativas
- Cliente sempre escolhe o barbeiro: mais simples, mas obriga o cliente a conhecer a equipe.
- Atribuir ao de menor preço ou por sorteio: favorece o cliente ou é imprevisível; distribuir pelo número de agendamentos do dia é mais justo com a equipe (ODS 8).
- Gorjeta só no local: menos trabalho no Checkout, mas o cliente que paga online não teria como deixar gorjeta.
- Escalonada só geral: base única e simples; preferimos permitir faixas por serviço porque o gerente pode querer incentivar serviços específicos.
- Concluir só com regra vigente: força o gerente a cadastrar, mas trava o atendimento do barbeiro por uma pendência administrativa.

## Consequências
- O core de horários livres precisa calcular a união dos barbeiros e escolher o atribuído de forma determinística (testável).
- `payments` guarda `amount_cents` e `tip_cents` separados também no online.
- Lançamentos "sem regra" aparecem destacados para o gerente corrigir as próximas.
