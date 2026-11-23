# 0021 — Endereço da barbearia: UF e cidade do IBGE embutidas, CEP e logradouro pelo ViaCEP

- **Status:** aceito
- **Data:** 2026-11-23

## Contexto
A spec 001 deixava a busca por CEP fora de escopo, mas o #26 (issue #21) já preenche o endereço pelo ViaCEP. Ainda assim, UF e cidade continuam texto livre: dá para gravar "sao paulo", "Sampa" ou uma cidade que não pertence à UF. Também falta ajuda para quem não sabe o CEP. Não existe API gratuita com todos os logradouros do país; a do IBGE só tem estados e municípios, e a busca de logradouro do ViaCEP (`/ws/{UF}/{cidade}/{logradouro}/json/`) exige UF, cidade e pelo menos 3 letras.

## Decisão
- **UF e cidade vêm de uma lista do IBGE gravada no repositório** (`packages/contracts`: 27 UFs e os municípios de cada uma, só nome). A web filtra as listboxes sem rede; a API rejeita cidade que não pertence à UF usando a mesma lista e grava o nome oficial. A lista é gerada uma vez por script a partir da API de localidades do IBGE e só muda com nova versão do arquivo.
- **Ordem do endereço:** CEP (preenche tudo, como no #26) ou UF → cidade → logradouro. Com UF e cidade escolhidas e 3+ letras, o logradouro sugere endereços do ViaCEP; escolher um preenche CEP (sobrepondo o que houver) e bairro. Sem escolher, bairro continua manual.
- **CEP inexistente limpa o campo** (não fica valor inválido no formulário). Falha de rede do ViaCEP não limpa: só abre o preenchimento manual.
- ViaCEP continua só no navegador, como ajuda de preenchimento; a API não depende dele para salvar.
- O campo "rua" passa a se chamar **logradouro** também no código e no banco (`addressLine` / `address_line`), por expand/contract: a coluna nova entra e passa a ser usada agora; `street` sai num PR posterior.

## Alternativas
- API do IBGE em tempo real (web e API): sempre atual, mas o cadastro trava ou perde a validação se o IBGE cair, e a API ganharia mais um serviço externo (porta + adapter, ADR-0017).
- Validar só na web: mais simples, mas a API aceitaria cidade inválida chamada diretamente.
- Logradouro como texto livre: menos trabalho, mas quem não sabe o CEP digita tudo à mão.

## Consequências
- ~100 KB de dados no pacote de contratos (entra no bundle da web só na tela de endereço, por import dinâmico).
- Município criado ou renomeado pelo IBGE exige atualizar o arquivo (raro).
- Barbearias gravadas antes desta regra podem ter cidade fora da lista: a edição de barbearia (backlog) as corrige.
