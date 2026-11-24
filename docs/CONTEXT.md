# Context — Shavey

> Linguagem ubíqua do sistema. Formato: **Termo PT** (identificador no código) — definição. _Evitar_: sinônimos proibidos.
> Termos marcados **(a confirmar)** não devem virar código antes de confirmados.

## Language

### Pessoas e perfis

**Usuário** (User)
Conta única de uma pessoa, com nome, e-mail (único) e telefone (Brasil, DDD + 10 ou 11 dígitos; pode se repetir entre usuários), todos obrigatórios. Um mesmo usuário pode atuar em vários perfis, em barbearias diferentes, ao mesmo tempo: não há troca de modo; o **Início** mostra tudo o que é dele (ADR-0022).
_Evitar_: conta (como sinônimo de pessoa), login

**Perfil** (Role)
Papel que o usuário exerce: **Cliente**, **Barbeiro** ou **Gerente**. Barbeiro e Gerente são sempre perfis *em uma barbearia*; Cliente é global.
_Evitar_: tipo de usuário, permissão

**Início** (Home)
Feed que todo usuário vê ao entrar, igual para todos os perfis (ADR-0022). Mostra o que existe para ele: convites pendentes, **Minhas barbearias** e **Meus vínculos** (e, quando existirem, busca, serviços da plataforma, recentes e favoritos, meus agendamentos).
_Evitar_: visão, modo, dashboard

**Minhas barbearias** (Managed barbershops)
Carrossel no Início com as barbearias em que o usuário é gerente. Tocar abre a **Gestão da barbearia**.

**Meus vínculos** (My memberships)
Carrossel no Início com os vínculos de barbeiro do usuário. Tocar abre a página do vínculo (somente leitura para o barbeiro). Quem é gerente e barbeiro da mesma barbearia aparece nos dois carrosséis.

**Gestão da barbearia** (Barbershop management)
Tela do gerente para uma barbearia: dados, serviços, equipe, convites (e, depois, regras de comissão e o **Painel**).
_Evitar_: painel de admin, admin, visão de gerente

**Cliente** (Client)
Perfil de quem agenda e recebe serviços em qualquer barbearia.
_Evitar_: customer, consumidor

**Barbeiro** (Barber)
Perfil de quem presta serviços numa barbearia, por **vínculo** (fixo) ou por **diária** (avulso). Quem trabalha sozinho cria a própria barbearia e é gerente e barbeiro dela.
_Evitar_: profissional, funcionário, cabeleireiro, autônomo

**Gerente** (Manager)
Perfil que administra uma barbearia: dados, serviços, vínculos, regras de comissão, pagamentos presenciais, bloqueios e contestações. Quem cria a barbearia torna-se gerente; uma barbearia pode ter vários gerentes. Outros gerentes entram por **convite** aceito.
_Evitar_: dono, admin, proprietário, recepcionista (não existe)

### Barbearia e equipe

**Barbearia** (Barbershop)
Estabelecimento onde barbeiros atendem. Toda informação de negócio pertence a uma barbearia. Tem nome e **endereço estruturado** (CEP, logradouro, número, complemento opcional, bairro, cidade, UF). Ao criá-la, o criador pode marcar **"eu também atendo"**, o que cria também o vínculo de barbeiro dele. O nome não é único: se já existir outra barbearia com o **mesmo nome** (ignorando maiúsculas, acentos e espaços), o sistema avisa e pede confirmação, sem impedir.
_Evitar_: loja, salão, estabelecimento

**Logradouro** (addressLine)
Rua, avenida, travessa etc. do endereço da barbearia, sem o número. Pode ser sugerido pelo ViaCEP depois de escolhidas UF e cidade (ADR-0021).
_Evitar_: rua (no código, `street` está em remoção)

**Cidade e UF** (city, state)
UF é uma das 27 siglas; cidade é um município do IBGE **daquela UF**, gravado com o nome oficial. Texto fora da lista não é aceito (ADR-0021).

**Convite** (Invitation)
Proposta feita por um gerente para que um usuário **já cadastrado** (identificado pelo e-mail) entre na barbearia como **barbeiro** (vínculo), **gerente** ou para uma **diária**. Estados: `pendente` → `aceito` (cria o vínculo, a gerência ou a diária), `recusado`, `cancelado` (pelo gerente) ou `expirado` (7 dias sem resposta; convite de diária expira também no início do período, o que vier antes). Nada existe antes do aceite: o barbeiro concorda com a relação de trabalho (ODS 8). O convidado recebe um **aviso** no sistema (sem e-mail no MVP).
_Evitar_: solicitação, pedido

**Vínculo** (BarberMembership)
Relação formal entre barbeiro e barbearia, criada quando o barbeiro **aceita o convite**: data de contratação, aprovado por quem (gerente que convidou), **exclusividade**, **turno permitido**, se aceita agendamentos, se está ativo, e os **serviços do barbeiro**. Base da formalização do trabalho (ODS 8, meta 8.3). Desativar o vínculo cancela todos os agendamentos futuros dele naquela barbearia (cancelamento pela barbearia: reembolso integral).

**Exclusividade** (Exclusivity)
Compromisso do barbeiro de atender só naquela barbearia. Vem proposta no convite de vínculo e só vale se o barbeiro aceitar. Se ele já tiver vínculos em outras barbearias, para aceitar precisa sair delas (desativando esses vínculos, com os cancelamentos de agenda que isso traz). Enquanto o vínculo exclusivo estiver ativo, ele não pode ter outro vínculo, disponibilidade, turno ou diária em outra barbearia, nem fechar a agenda para aceitar uma diária. Gerente e barbeiro podem, de comum acordo, retirar a exclusividade depois. Futuro: o gerente poderá permitir diárias num vínculo exclusivo. Diária nunca é exclusiva.
_Evitar_: contrato, contratação

**Turno permitido** (AllowedShift)
Janelas semanais (dia da semana, início, fim) que o gerente **pode** definir no vínculo. Opcional: com turno, toda **disponibilidade** do barbeiro naquela barbearia precisa caber numa janela dele; sem turno, o barbeiro abre a agenda como quiser. Mudar um turno que deixaria disponibilidade de fora não é imposto: vira uma **proposta de mudança de turno** que o barbeiro aceita ou recusa (como um convite); enquanto pendente, vale o turno atual.
_Evitar_: expediente, jornada

**Diária** (Gig)
Trabalho avulso de um barbeiro numa barbearia, sem vínculo: uma data e um período (ex.: sáb 09:00–18:00), com a **regra de comissão** proposta pelo gerente no convite. Nasce de um convite de diária aceito pelo barbeiro; ao aceitar, o período vira disponibilidade dele naquela barbearia naquela data. Se o período conflitar com a agenda dele em outra barbearia, o aceite leva a uma tela de conflitos: ele recusa o convite ou **fecha a agenda** nas outras barbearias só no intervalo que conflita (cancelando os agendamentos desse intervalo).
_Evitar_: freela, bico, plantão

**Disponibilidade** (BarberAvailability)
Janelas em que um barbeiro atende numa barbearia: semanais (dia, início, fim, vigência), definidas pelo próprio barbeiro (dentro do turno, se houver), ou datadas, criadas por uma diária. Disponibilidades do mesmo barbeiro não podem se sobrepor, nem na mesma barbearia nem em barbearias diferentes.
_Evitar_: horário (ambíguo), expediente

**Fechamento de agenda** (ScheduleClosure)
Período (dias ou horas) em que o barbeiro deixa de atender, numa barbearia ou em todas. Remove os horários livres do período e **cancela** os agendamentos que caem nele, como cancelamento pelo barbeiro (reembolso integral).
_Evitar_: bloqueio (é sobre cliente), folga

### Catálogo e agenda

**Serviço** (Service)
Oferecido por uma barbearia, com **preço padrão** e **duração padrão** definidos pelo gerente. Duração mínima de 15 minutos, sempre em múltiplos de 15. O gerente cria o serviço e altera nome, preço e duração quando quiser (agendamentos já feitos mantêm o **preço congelado**). Também pode **desativar** um serviço: ele some para novos agendamentos, mas continua no histórico (nunca é excluído).
_Evitar_: procedimento, produto

**Serviço do barbeiro** (BarberService)
Indica que um barbeiro realiza um serviço naquela barbearia, com **preço e duração próprios** opcionais, definidos pelo gerente no vínculo. Sem valor próprio, vale o padrão do serviço.

**Horário livre** (Slot)
Início possível de um agendamento: múltiplo de 15 minutos, dentro da disponibilidade, ocupando a duração do serviço do barbeiro, sem sobrepor outro agendamento ativo do barbeiro em qualquer barbearia.

**Agendamento** (Appointment)
Reserva de um serviço com um barbeiro, numa barbearia, num intervalo de tempo. Congela preço e duração no momento da reserva (**preço congelado**, `priceSnapshot`). Registra a **forma de pagamento escolhida**: online ou no local.
_Evitar_: reserva, booking, marcação, horário

**Antecedência** (Lead time)
Tempo entre o momento em que o agendamento foi feito (ou remarcado pela última vez) e o horário marcado. Determina se a política de cancelamento por faixas se aplica.

**Status do agendamento** (AppointmentStatus)
- `pendente` (pending): escolheu pagar online e ainda não pagou; o horário fica reservado até a sessão de pagamento expirar (30 min).
- `confirmado` (confirmed): pago online, ou escolhido pagar no local.
- `em atendimento` (in_progress) → `concluído` (completed).
- `cancelado` (cancelled): por cliente, barbeiro, gerente ou expiração do pagamento online.
- `não compareceu` (no_show): só a partir de `confirmado`, marcado por barbeiro/gerente após o horário.

**Remarcação** (Reschedule)
Troca do horário de um agendamento, mantendo serviço, preço congelado e pagamento, sempre sem conflito de agenda. **Pelo cliente**: livre até 1h antes do horário. **Pelo barbeiro**: vira uma **proposta de remarcação** que o cliente aceita ou recusa; enquanto pendente, o novo horário fica reservado e o original continua valendo; recusada ou sem resposta até o horário original, a proposta cai.
_Evitar_: reagendamento, troca

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
Encerramento de um agendamento antes do atendimento, registrando quem cancelou e quando. Todo cancelamento gera um **aviso** aos gerentes da barbearia.

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

### Avisos

**Aviso** (Notice)
Mensagem dentro do sistema para um usuário (convite recebido, cancelamento na barbearia que gerencia, mudança de nome ou de endereço da barbearia em que tem agendamento futuro), com indicação de não lidos. Sem e-mail ou push no MVP (ADR-0010).
_Evitar_: notificação, alerta

**Assinatura** (Subscription) — fora do MVP
Plano recorrente que o cliente paga à barbearia por um pacote de atendimentos (ex.: cortes ilimitados ou N por mês). "Em aberto" = assinatura ativa. Registrado só para os avisos de mudança da barbearia; não vira código no MVP.
_Evitar_: plano, mensalidade, clube

### Avaliação

**Avaliação** (Review)
Nota de 1 a 5 e comentário do cliente sobre um agendamento concluído. Uma por agendamento.
