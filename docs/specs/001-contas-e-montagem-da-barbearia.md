# 001 — Contas e montagem da barbearia (semana 1)

## Objetivo / outcome
Um gerente cria a conta, monta a barbearia em produção (dados, serviços, equipe por convite) e um barbeiro vinculado define quando atende. Sabemos que funcionou quando a demo de domingo (22/11) mostra, no site da Vercel: cadastro → barbearia criada → serviços → barbeiro convidado aceita → turno → disponibilidade.

## Conceitos do domínio
Usuário, Perfil, Visão, Cliente, Barbeiro, Gerente, Barbearia, Convite, Vínculo, Turno permitido, Disponibilidade, Serviço, Serviço do barbeiro (`docs/CONTEXT.md`; ADR-0011, ADR-0018, ADR-0019).

## Regras de negócio
**Conta e sessão**
- R1. Cadastro com nome, e-mail, telefone e senha, todos obrigatórios. Senha com no mínimo 8 caracteres. E-mail único, comparado sem diferenciar maiúsculas. Telefone brasileiro (DDD + 10 ou 11 dígitos, guardado só com dígitos), pode se repetir entre usuários.
- R2. Todo usuário é cliente; não existe papel global (ADR-0011).
- R3. Login cria sessão opaca no banco e cookie `httpOnly; Secure; SameSite=Lax` (ADR-0006). Logout apaga a sessão. Sessão expirada = não autenticado.
- R4. Login com e-mail ou senha errados responde a mesma mensagem genérica (não revela se o e-mail existe).

**Perfis e visões**
- R5. `GET /me` devolve o usuário e seus perfis: cliente, e para cada barbearia se é gerente e/ou barbeiro.
- R6. A interface alterna visões (cliente; gerente ou barbeiro de uma barbearia). O backend autoriza sempre pelo vínculo, nunca pela visão escolhida.

**Barbearia**
- R7. Qualquer usuário cria uma barbearia com nome e endereço estruturado: CEP (8 dígitos), rua, número, complemento (opcional), bairro, cidade, UF (sigla válida).
- R8. O criador vira gerente na hora; se marcar "eu também atendo", ganha também vínculo de barbeiro ativo (data de contratação = data de criação, aprovado por ele mesmo).

**Serviços**
- R9. Só gerente da barbearia cria, edita e desativa/reativa serviços: nome, preço padrão (centavos, > 0) e duração padrão (≥ 15 min, múltiplo de 15). Serviço nunca é excluído; desativado não aparece para novos agendamentos.

**Convites e vínculos (ADR-0018)**
- R10. Só gerente convida, informando e-mail e tipo (barbeiro ou gerente); convite de barbeiro diz se o vínculo é exclusivo. O e-mail precisa ser de usuário cadastrado.
- R11. Não convida quem já tem aquele perfil na barbearia, nem repete convite pendente para o mesmo e-mail e tipo.
- R12. Convite pendente expira 7 dias após criado. Estados: pendente → aceito | recusado | cancelado | expirado.
- R13. Só o convidado aceita ou recusa; só gerente da barbearia cancela. Só convite pendente e não expirado muda de estado.
- R14. Aceitar convite de gerente cria a gerência. Aceitar convite de barbeiro cria o vínculo: data de contratação = data do aceite, aprovado por = gerente que convidou, ativo, aceitando agendamentos, exclusividade = a proposta no convite.
- R14b. Usuário com vínculo exclusivo ativo não pode aceitar convite de barbeiro de outra barbearia nem criar barbearia marcando "eu também atendo".
- R14c. Ao aceitar um convite **exclusivo** tendo vínculos ativos em outras barbearias, o barbeiro vê a lista delas e confirma a saída: esses vínculos são desativados e as disponibilidades deles encerradas na data do aceite. Sem confirmar, o convite segue pendente. (O cancelamento de agendamentos futuros entra junto com o cancelamento, semana 2–3.)
- R15. O gerente edita no vínculo: turno permitido **opcional** (janelas semanais dia/início/fim), se aceita agendamentos, se está ativo. Retirar a exclusividade (por acordo) fica fora da semana 1.
- R16. O gerente define os serviços do barbeiro (quais serviços da barbearia ele realiza) com preço e duração próprios opcionais; sem valor próprio vale o padrão. Duração própria segue R9.

**Disponibilidade**
- R17. Só o próprio barbeiro, com vínculo ativo, define sua disponibilidade na barbearia: janelas semanais (dia, início, fim) com vigência (início obrigatório, fim opcional).
- R18. Início e fim em múltiplos de 15 min, início < fim, dentro do mesmo dia.
- R19. Se o vínculo tiver turno permitido, cada janela precisa caber inteira numa janela do turno do mesmo dia. Sem turno, qualquer janela vale (ADR-0019).
- R20. Janelas do mesmo barbeiro não podem se sobrepor em vigências que se cruzam, na mesma barbearia ou em outra.
- R21. Na semana 1, o gerente só altera o turno se nenhuma disponibilidade existente ficar de fora; caso contrário, erro "há disponibilidade fora do novo turno". A proposta de mudança de turno ao barbeiro (ADR-0019) entra na semana 3.

## Critérios de aceite
- CA1 (R1, R3) Given visitante, When se cadastra com dados válidos, Then entra logado e vê a visão de cliente.
- CA2 (R1) Given e-mail já cadastrado (em qualquer caixa), When tenta se cadastrar, Then recebe "e-mail já cadastrado".
- CA3 (R3, R4) Given usuário, When erra a senha, Then recebe mensagem genérica; When acerta, Then fica logado; When sai, Then a sessão some do banco e `/me` responde 401.
- CA4 (R5, R6) Given gerente de A e barbeiro de B, When abre o seletor, Then vê Cliente, Gerente·A e Barbeiro·B; When chama rota de gerente de B, Then 403.
- CA5 (R7, R8) Given usuário logado, When cria barbearia válida marcando "eu também atendo", Then aparece como gerente e barbeiro dela; sem marcar, só gerente.
- CA6 (R7) Given CEP com 7 dígitos ou UF inexistente, When envia, Then erro no campo.
- CA7 (R9) Given gerente, When cria serviço de 20 min, Then erro de duração; When cria de 30 min e R$ 40,00, Then aparece na lista; When desativa, Then aparece como inativo e continua listado para o gerente.
- CA8 (R9) Given usuário que não é gerente da barbearia, When tenta criar serviço, Then 403.
- CA9 (R10, R14) Given gerente, When convida e-mail cadastrado como barbeiro e o convidado aceita, Then o vínculo existe com contratação = data do aceite e aprovado por = quem convidou.
- CA10 (R10) Given e-mail sem conta, When convida, Then erro "usuário não encontrado".
- CA11 (R11) Given convite pendente para o mesmo e-mail e tipo, When convida de novo, Then erro.
- CA12 (R12, R13) Given convite criado há 8 dias, When o convidado tenta aceitar, Then aparece como expirado e nada é criado.
- CA13 (R13) Given convite pendente, When o convidado recusa ou o gerente cancela, Then o convite muda de estado e não pode mais ser aceito.
- CA9b (R14b) Given barbeiro com vínculo exclusivo na A, When tenta aceitar convite de barbeiro da B, Then erro e nenhum vínculo é criado.
- CA9c (R14c) Given barbeiro com vínculos ativos na A e na B, When aceita convite exclusivo da C e confirma a saída, Then fica só com o vínculo da C; When não confirma, Then nada muda.
- CA14 (R15) Given vínculo, When o gerente define turno seg–sáb 09:00–18:00, Then o turno aparece no vínculo.
- CA15 (R16) Given serviço "Corte" padrão R$ 40/30 min, When o gerente define R$ 50 para o barbeiro, Then o serviço do barbeiro mostra R$ 50 e 30 min.
- CA16 (R17–R19) Given turno seg 09:00–18:00, When o barbeiro cadastra seg 10:00–12:00, Then salva; When cadastra seg 17:00–19:00, Then erro "fora do turno".
- CA16b (R19) Given vínculo sem turno, When o barbeiro cadastra dom 07:00–22:00, Then salva.
- CA17 (R20) Given disponibilidade seg 10:00–12:00 na barbearia A, When o barbeiro cadastra seg 11:00–13:00 na A ou na B com vigência que se cruza, Then erro de sobreposição.
- CA18 (R21) Given turno seg 09:00–18:00 e disponibilidade seg 16:00–18:00, When o gerente muda o turno para seg 09:00–15:00, Then erro e o turno continua o mesmo.

## Fora de escopo
Recuperação de senha, verificação de e-mail, login social, notificações por e-mail, busca de endereço por CEP (entrou depois, na #21; endereço e nome seguem na spec 002), foto/logo da barbearia, sair de uma barbearia ou excluir barbearia, remover gerente, transferir convite, regras de comissão (semana 2), horários livres e agendamento (semana 2), painel geral, avisos, diária, fechamento de agenda e remarcação (semanas 2–3, ADR-0019), retirar exclusividade e permitir diárias num vínculo exclusivo.

## Interface
- O slogan "Passa a máquina na fila." aparece na tela de cadastro (`docs/design-system.md`).

## Restrições
- Sessão: ADR-0006 (cookie, tabela `sessions`, senha com argon2 ou bcrypt custo ≥ 12), checagem de `Origin` em rotas que mudam estado. Duração da sessão: 7 dias.
- Toda rota de barbearia escopada por `barbershopId` com verificação de vínculo (skill `seguranca-authz`).
- Regras de convite, serviço e disponibilidade no `core/` puro com TDD; tempo vem por parâmetro (`Clock`).
- Sobreposição de disponibilidade validada no core; garantia no banco quando viável (constraint).
- Horários em `America/Sao_Paulo` na exibição; janelas semanais guardadas como dia + minutos do dia.
- Cada fatia cria suas migrations (expand/contract) e acrescenta dados à seed da demo.

## Seed da demo
`apps/api/prisma/seed.ts` cresce a cada fatia. Reaproveita nomes, serviços e bios da seed da disciplina de BD (`docs/referencias/`), mas segue as regras atuais: centavos, durações em passos de 15 min, poucos registros (3–4 barbearias, ~10 barbeiros, ~20 clientes), ao menos um barbeiro em duas barbearias sem sobreposição. A senha das contas de demo vem de `SEED_DEMO_PASSWORD` (nunca no código: repositório público).

## Perguntas em aberto
Nenhuma.
