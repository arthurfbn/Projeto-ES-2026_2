# 0018 — Entrada na barbearia por convite com aceite

- **Status:** aceito
- **Data:** 2026-11-20

## Contexto
O ADR-0011 define que barbeiros e gerentes são perfis por barbearia, mas não diz como alguém passa a ter esse perfil. Se o gerente pudesse criar o vínculo sozinho, um barbeiro apareceria ligado a uma barbearia sem ter concordado, o que contraria a ideia de formalizar a relação de trabalho (ODS 8, meta 8.3).

## Decisão
- Barbeiro e gerente entram numa barbearia por **convite**, feito por um gerente dela, para o e-mail de um usuário **já cadastrado**. E-mail sem conta → erro, sem convite.
- O vínculo (barbeiro) ou a gerência só existem depois que o convidado **aceita**. Ele também pode recusar; o gerente pode cancelar enquanto estiver pendente.
- O convite **expira em 7 dias** sem resposta. A expiração é verificada no momento de agir (aceitar/listar), sem job agendado.
- Sem notificação por e-mail (fora do MVP, ADR-0010): o convidado vê os convites pendentes ao entrar.
- Exceção: quem cria a barbearia vira gerente dela na hora, e vira barbeiro também se marcar "eu também atendo".
- O vínculo pode ter **turno permitido** (janelas semanais) definido pelo gerente; se houver, a disponibilidade do barbeiro precisa caber nele (opcional desde o ADR-0019). A **exclusividade** vem proposta no convite de vínculo e o barbeiro a aceita junto; com vínculo exclusivo ativo ele não atua em outra barbearia (nem por diária). Para aceitar um convite exclusivo, ele sai dos outros vínculos. A exclusividade pode ser retirada depois, por acordo entre gerente e barbeiro.
- Sem e-mail: o convite gera um **aviso** dentro do sistema (ADR-0019).

## Alternativas
- Gerente adiciona direto por e-mail: mais simples, mas o barbeiro não consente.
- Convite para e-mail sem conta, ligado no cadastro: mais flexível, mas exige tratar convite órfão e e-mail não verificado.

## Consequências
- Mais uma entidade (`invitations`) e um fluxo a mais na semana 1.
- O núcleo de domínio decide estados do convite (pendente/aceito/recusado/cancelado/expirado) com o tempo recebido como parâmetro.
- Trabalho avulso (diária) também entra por convite, com período e regra de comissão (ADR-0019).
