# 002 — Nome e endereço da barbearia

## Objetivo / outcome
Quem cria a barbearia é avisado se já existe outra com o mesmo nome e grava um endereço confiável: UF e cidade oficiais do IBGE, CEP que existe e logradouro sugerido quando não sabe o CEP. Sabemos que funcionou quando nenhuma barbearia nova é gravada com cidade fora da UF e quem não sabe o CEP chega a ele escolhendo UF, cidade e logradouro.

## Conceitos do domínio
Barbearia, Logradouro, Cidade e UF, Aviso, Assinatura (futuro) (`docs/CONTEXT.md`; ADR-0021).

## Regras de negócio
**Nome**
- R1. Dois nomes são "o mesmo nome" quando ficam iguais depois de ignorar maiúsculas, acentos e espaços extras (início, fim e repetidos). A comparação é com todas as barbearias do sistema.
- R2. Nome repetido não é erro: a API aceita. A tela mostra um aviso discreto (sem cor de erro) e um botão sutil no fim do campo para confirmar. Enquanto não confirmar, salvar não envia e leva o foco ao aviso. Mudar o nome desfaz a confirmação.
- R3. A consulta de nome exige sessão e responde só se o nome já existe, sem dados da outra barbearia.

**Endereço**
- R4. UF é escolhida numa listbox das 27 siglas que aceita digitação para filtrar.
- R5. Cidade é escolhida numa listbox, com digitação, dos municípios do IBGE da UF escolhida. Trocar a UF limpa a cidade. A API rejeita cidade que não pertence à UF e grava o nome oficial (ex.: "sao paulo" → "São Paulo").
- R6. CEP inexistente limpa o campo CEP e mostra o aviso; o formulário nunca fica com CEP inválido. Falha de rede ou tempo esgotado não limpa: só abre o preenchimento manual (como no #21).
- R7. CEP encontrado preenche logradouro, bairro, UF e cidade (comportamento do #21). Se a cidade do ViaCEP não bater com a lista do IBGE, o campo cidade fica aberto com o erro de R5.
- R8. O campo "Rua" passa a ser **Logradouro** na tela, no contrato (`addressLine`) e no banco (`address_line`), por expand/contract.
- R9. Com UF e cidade escolhidas e 3 ou mais letras no logradouro, aparece uma listbox com sugestões do ViaCEP (logradouro, bairro, faixa de numeração quando houver, CEP). Escolher uma sugestão preenche logradouro, CEP (sobrepondo o que houver) e bairro. Sem escolher, o logradouro fica como digitado e bairro e CEP não mudam.

## Critérios de aceite
- CA1 (R1, R2) Given existe "Barbearia do Zé", When digito "barbearia do ze " no nome, Then vejo o aviso de nome repetido e o botão de confirmar; When tento salvar sem confirmar, Then nada é enviado; When confirmo e salvo, Then a barbearia é criada.
- CA2 (R2) Given nome confirmado, When altero o nome para outro também repetido, Then preciso confirmar de novo.
- CA3 (R1) Given nome sem repetição, When salvo, Then nenhum aviso aparece.
- CA4 (R3) Given visitante sem sessão, When consulta o nome, Then 401.
- CA5 (R4, R5) Given UF "SP", When digito "campi" na cidade, Then a listbox mostra "Campinas"; When troco a UF para "RJ", Then a cidade é limpa.
- CA6 (R5) Given UF "RJ" e cidade "Campinas" enviadas direto à API, When cria a barbearia, Then 400 com erro no campo cidade.
- CA7 (R6) Given CEP 00000-000 (inexistente), When termina a busca, Then o campo CEP fica vazio e aparece "CEP não encontrado".
- CA8 (R8) Given barbearia criada, Then o logradouro é gravado em `address_line` e aparece como "Logradouro" na tela.
- CA9 (R9) Given UF "SP", cidade "São Paulo" e "Paulis" no logradouro, When escolho "Avenida Paulista · Bela Vista · 01310-100", Then logradouro, CEP e bairro ficam preenchidos; When não escolho nada, Then bairro e CEP continuam vazios.

## Fora de escopo
Edição de nome e endereço da barbearia e os avisos aos clientes com agendamento futuro (issue de backlog), remover a coluna `street` (contract, backlog), bordas arredondadas de checkbox/radio (backlog), corrigir barbearias já gravadas com cidade fora da lista, mapa e geolocalização, nome único obrigatório.

## Restrições
- ADR-0021: lista do IBGE em `packages/contracts`, carregada sob demanda na web; ViaCEP só no navegador, com tempo limite e falha tratada.
- Consulta de nome por coluna normalizada e indexada (sem varrer a tabela a cada tecla); a web consulta com atraso (debounce) e só quando o nome é válido.
- Migration expand/contract para `address_line` (skill `banco-migrations`).
- Listboxes acessíveis (combobox com teclado e leitor de tela), mobile em 375 px.

## Perguntas em aberto
Nenhuma.

## Tickets
- #27 aviso de nome repetido (R1–R3)
- #28 UF e cidade do IBGE; CEP inexistente limpa o campo (R4–R7)
- #29 rua vira logradouro, expand (R8)
- #30 sugestões de logradouro pelo ViaCEP (R9; depende de #28 e #29)
- Backlog: #31 remove `street` (contract), #32 edição de nome e endereço com avisos, #33 checkbox e radio arredondados
