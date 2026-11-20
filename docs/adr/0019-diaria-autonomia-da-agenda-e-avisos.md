# 0019 — Diária, autonomia da agenda do barbeiro e avisos no sistema

- **Status:** aceito
- **Data:** 2026-11-20

## Contexto
O Shavey também deve servir como ponte de trabalho avulso entre gerentes e barbeiros: "meu barbeiro faltou hoje, preciso de alguém". Ao mesmo tempo, o barbeiro precisa de autonomia sobre a própria agenda (abrir, fechar, cancelar, remarcar). O ADR-0018 previa só vínculo fixo, com turno obrigatório, e o ADR-0010 deixa notificações por e-mail fora do MVP.

## Decisão
- **Diária:** modalidade sem vínculo. O gerente envia um convite de diária (data, período e regra de comissão proposta) ao e-mail de um usuário cadastrado. Ao aceitar, o período vira disponibilidade datada naquela barbearia. A remuneração usa as mesmas regras de comissão do vínculo (percentual, fixa ou escalonada).
- **Conflito no aceite da diária:** o sistema não recusa sozinho. Abre uma tela onde o barbeiro escolhe entre recusar o convite ou fechar a agenda nas outras barbearias **só no intervalo que conflita**, o que cancela os agendamentos desse intervalo com reembolso integral.
- **Turno permitido opcional:** se o gerente definir turno no vínculo, a disponibilidade precisa caber nele. Sem turno, o barbeiro abre a agenda como quiser.
- **Mudança de turno:** se deixaria disponibilidade existente de fora, o sistema não aplica sozinho: vira proposta ao barbeiro, que aceita ou recusa. Pendente, vale o turno atual. O tratamento de conflitos no aceite (ajustar disponibilidade, fechar agenda ou sair de outra barbearia) é detalhado junto com a diária, na semana 3.
- **Expiração do convite de diária:** 7 dias ou o início do período da diária, o que vier antes.
- **Fechamento de agenda:** o barbeiro fecha um período (dias ou horas) numa barbearia ou em todas. Os agendamentos que caem nele são cancelados pelo barbeiro, com reembolso integral.
- **Remarcação:** o cliente remarca sozinho até 1h antes do horário. O barbeiro só propõe a remarcação. O cliente aceita ou recusa, e enquanto a proposta está pendente os dois horários ficam reservados. A antecedência da política de cancelamento passa a contar da última remarcação.
- **Avisos dentro do sistema:** convites e cancelamentos geram avisos com contador de não lidos. Todo cancelamento avisa os gerentes da barbearia. Notificação por e-mail continua fora do MVP (ADR-0010) e entra como próximo passo.
- **Prioridade:** a diária por convite é Should na semana 3, depois do cancelamento. A busca de barbeiros com avaliações é Could, porque depende das avaliações.

## Alternativas
- Diária como vínculo com data de fim: evita termo novo, mas mistura relação fixa e eventual.
- Recusa automática da diária quando há conflito: mais simples, mas tira a escolha do barbeiro.
- Aviso por e-mail já no MVP: mais fiel à ideia, mas exige provedor, remetente e revisão do ADR-0010, cerca de 1 dia de trabalho.
- Remarcação pelo cliente sem limite: permitiria fugir da política de cancelamento remarcando em cima da hora para depois cancelar com 100%.

## Consequências
- Novas entidades: diária (ou convite com tipo `gig`), fechamento de agenda, proposta de remarcação e aviso.
- A disponibilidade passa a ter janelas semanais e janelas datadas. Horários livres e a constraint de sobreposição precisam considerar as duas, mais os fechamentos.
- O cancelamento em massa (fechamento e conflito de diária) reaproveita o caso de uso de cancelamento pelo barbeiro: um reembolso integral por agendamento.
- Semana 1 muda só no turno (opcional). O resto entra nas semanas 2 e 3.
