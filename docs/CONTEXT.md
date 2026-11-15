# Context — Shavey

> Linguagem ubíqua do sistema. Formato: **Termo PT** (identificador no código) — definição. _Evitar_: sinônimos proibidos.
> Termos marcados **(a confirmar)** não devem virar código antes de confirmados.

## Language

### Pessoas e perfis

**Usuário** (User)
Conta única de uma pessoa. Um mesmo usuário pode atuar em vários perfis, em barbearias diferentes, alternando entre **visões**.
_Evitar_: conta (como sinônimo de pessoa), login

**Perfil** (Role)
Papel que o usuário exerce: **Cliente**, **Barbeiro** ou **Gerente**. Barbeiro e Gerente são sempre perfis *em uma barbearia*; Cliente é global.
_Evitar_: tipo de usuário, permissão

**Visão** (View)
Modo da interface correspondente a um perfil e, para barbeiro/gerente, à barbearia selecionada (ou "todas", no painel geral do gerente).

**Cliente** (Client)
Perfil de quem agenda e recebe serviços em qualquer barbearia.
_Evitar_: customer, consumidor

**Barbeiro** (Barber)
Perfil de quem presta serviços. Só existe vinculado a pelo menos uma barbearia; quem trabalha sozinho cria a própria barbearia e é gerente e barbeiro dela.
_Evitar_: profissional, funcionário, cabeleireiro, autônomo

**Gerente** (Manager)
Perfil que administra uma barbearia: dados, serviços, vínculos, regras de comissão, pagamentos presenciais, bloqueios e contestações. Quem cria a barbearia torna-se gerente; uma barbearia pode ter vários gerentes.
_Evitar_: dono, admin, proprietário, recepcionista (não existe)

### Barbearia e equipe

**Barbearia** (Barbershop)
Estabelecimento onde barbeiros atendem. Toda informação de negócio pertence a uma barbearia.
_Evitar_: loja, salão, estabelecimento

**Vínculo** (BarberMembership)
Relação formal entre barbeiro e barbearia, criada pelo gerente na contratação: data de contratação, aprovado por quem, exclusividade, turno permitido, se aceita agendamentos, se está ativo, e os **serviços do barbeiro**. Base da formalização do trabalho (ODS 8, meta 8.3).
_Evitar_: contrato, contratação

**Disponibilidade** (BarberAvailability)
Janelas semanais (dia, início, fim, vigência) em que um barbeiro atende numa barbearia. Disponibilidades do mesmo barbeiro em barbearias diferentes não podem se sobrepor.
_Evitar_: horário (ambíguo), expediente

### Catálogo e agenda

**Serviço** (Service)
Oferecido por uma barbearia, com **preço padrão** e **duração padrão** definidos pelo gerente. Duração mínima de 15 minutos, sempre em múltiplos de 15.
_Evitar_: procedimento, produto

**Serviço do barbeiro** (BarberService)
Indica que um barbeiro realiza um serviço naquela barbearia, com **preço e duração próprios** opcionais, definidos pelo gerente no vínculo. Sem valor próprio, vale o padrão do serviço.

**Horário livre** (Slot)
Início possível de um agendamento: múltiplo de 15 minutos, dentro da disponibilidade, ocupando a duração do serviço do barbeiro, sem sobrepor outro agendamento ativo do barbeiro em qualquer barbearia.

**Agendamento** (Appointment)
Reserva de um serviço com um barbeiro, numa barbearia, num intervalo de tempo. Congela preço e duração no momento da reserva (**preço congelado**, `priceSnapshot`). Registra a **forma de pagamento escolhida**: online ou no local.
_Evitar_: reserva, booking, marcação, horário

**Antecedência** (Lead time)
Tempo entre o momento em que o agendamento foi feito e o horário marcado. Determina se a política de cancelamento por faixas se aplica.

**Status do agendamento** (AppointmentStatus)
- `pendente` (pending): escolheu pagar online e ainda não pagou; o horário fica reservado até a sessão de pagamento expirar (30 min).
- `confirmado` (confirmed): pago online, ou escolhido pagar no local.
- `em atendimento` (in_progress) → `concluído` (completed).
- `cancelado` (cancelled): por cliente, barbeiro, gerente ou expiração do pagamento online.
- `não compareceu` (no_show): só a partir de `confirmado`, marcado por barbeiro/gerente após o horário.

**Não comparecimento** (NoShow)
Cliente não apareceu. Financeiramente equivale a cancelar com 1h ou menos (nada recuperável), mas é um status próprio para métricas.
_Evitar_: falta, bolo

### Dinheiro

**Pagamento** (Payment)
Registro de valor pago. Todo pagamento é registrado, inclusive em dinheiro. **Online**: Stripe, antecipado. **No local** (presencial): dinheiro, cartão ou Pix na barbearia, registrado pelo barbeiro ou gerente.
_Evitar_: transação, cobrança

**Gorjeta** (Tip)
Valor extra pago ao barbeiro, separado do preço do serviço; não entra na base de comissão.

**Cancelamento** (Cancellation)
Encerramento de um agendamento antes do atendimento, registrando quem cancelou e quando.

**Política de cancelamento** (CancellationPolicy)
Percentual **recuperável** pelo cliente:
| Cancelado por | Quando | Recuperável |
|---|---|---|
| Barbeiro, gerente ou expiração | qualquer momento | 100% |
| Cliente | ≥ 24h antes | 100% |
| Cliente (agendamento feito com ≥ 24h de antecedência) | 24h–12h antes | 75% |
| Cliente (idem) | 12h–6h antes | 50% |
| Cliente (idem) | 6h–1h antes | 25% |
| Cliente (idem) | ≤ 1h antes | 0% |
| Cliente (agendamento feito com < 24h de antecedência) | mais de 1h antes | 100% |
| Cliente (idem) | ≤ 1h antes | 0% |
| Não comparecimento | — | 0% |

**Reembolso** (Refund)
Devolução, via Stripe, da parte recuperável de um pagamento online.

**Cobrança em aberto** (OutstandingCharge)
Valor devido quando o cliente cancela ou não comparece **sem ter pago**: a parte não recuperável do preço congelado. Enquanto existir, o cliente não agenda em nenhuma barbearia (**restrição por inadimplência**). Quitada online ou no local; a restrição cai **imediatamente** na quitação.
_Evitar_: dívida, multa, débito

**Bloqueio** (Block)
Decisão manual do barbeiro (para si) ou do gerente (para a barbearia) de impedir um cliente de agendar com eles. Só pode ser criado para cliente com cobrança em aberto, mas **não cai com a quitação**: permanece até o barbeiro ou gerente desbloquear. Na lista de bloqueios, o sistema indica quando o cliente já quitou a cobrança que motivou o bloqueio.
_Evitar_: banimento; não confundir com a restrição por inadimplência, que é automática e global

**Contestação** (Dispute)
Aberta pelo cliente quando declara ter pago no local e o pagamento não foi reconhecido. Estados: `aberta` → `aceita` (pagamento registrado, cobrança quitada) ou `recusada`. Decidida por um gerente da barbearia.

### Remuneração e métricas (ODS 8, meta 8.5)

**Regra de comissão** (CommissionRule)
Como calcular a comissão do barbeiro numa barbearia: **percentual**, **fixa** (valor por atendimento) ou **escalonada**; geral ou por serviço; sempre com vigência.

**Comissão escalonada** (Tiered commission)
Faixas de percentual sobre o **faturamento mensal do barbeiro naquela barbearia** (mês civil, fuso de São Paulo). Cálculo **marginal**: cada parte do valor recebe o percentual da faixa em que cai, como no imposto de renda — passar de faixa nunca diminui o que já foi ganho.

**Lançamento de comissão** (CommissionEntry)
Comissão apurada quando um agendamento é concluído e pago, com a regra aplicada e a base de cálculo.
_Evitar_: repasse

**Faturamento** (Revenue)
Soma dos preços pagos de agendamentos concluídos (sem gorjeta) num período.

**Comissão do barbeiro** (Barber earnings)
Soma dos lançamentos de comissão do barbeiro no período (+ gorjetas, exibidas separadamente).

**Resultado da barbearia** (Shop net revenue)
Faturamento − comissões no período. O MVP não registra despesas, então não é lucro contábil.
_Evitar_: lucro (até existirem despesas)

**Margem** (Margin)
Resultado da barbearia ÷ faturamento. Para o barbeiro: comissão ÷ faturamento que ele gerou.

**Ticket médio** (AverageTicket)
Faturamento ÷ número de agendamentos concluídos no período.

**Painel** (Dashboard)
Do barbeiro: faturamento gerado, comissão, gorjetas, margem, ticket médio, média de avaliações, serviços mais bem avaliados; filtros por período, cliente e barbearia. Do gerente: os mesmos indicadores por barbearia e geral (todas que administra), mais resultado, comparação entre barbeiros, cancelamentos e não comparecimentos.

### Avaliação

**Avaliação** (Review)
Nota de 1 a 5 e comentário do cliente sobre um agendamento concluído. Uma por agendamento.
