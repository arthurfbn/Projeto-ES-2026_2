# 0022 — Início único com navbar, sem seletor de visão

- **Status:** aceito (substitui o item de "visões" do ADR-0011)
- **Data:** 2026-11-23

## Contexto
O ADR-0011 e a spec 001 (R6) previam um seletor de visão: o usuário escolhia "Cliente", "Gerente · A" ou "Barbeiro · B" e a interface mudava de modo (PR #23, não mesclado). Obrigar a pessoa a trocar de modo para ver o que é dela é atrito desnecessário: o gerente também é cliente, e o barbeiro pode atuar em várias barbearias. Sem o seletor, porém, não havia como voltar à própria barbearia depois de entrar.

## Decisão
- **Não há seletor de visão.** Todo usuário entra no mesmo **Início**, um feed que mostra tudo o que existe para ele. O backend continua autorizando por vínculo/gerência (ADR-0011).
- **Casca do app:** navbar lateral no desktop; no celular (< 768 px) os mesmos itens viram barra de abas no rodapé.
- **Início, de cima para baixo (visão completa):** busca; serviços disponíveis na plataforma; **Minhas barbearias** (carrossel, onde é gerente → Gestão da barbearia); **Meus vínculos** (carrossel → página do vínculo); recentes e favoritos (carrossel); botão Meus agendamentos; botão de ofertas.
- **Navbar (visão completa):** Início, Agenda, Criar barbearia, Sair. A **Agenda** reúne os horários do usuário como cliente e como barbeiro, com diferença visual nítida entre os dois.
- **Entrega incremental:** cada bloco entra junto com a funcionalidade que o alimenta, sem tela vazia antecipada (CLAUDE.md). Semana 1: navbar (Início, Criar barbearia, Sair), convites, Minhas barbearias e Meus vínculos. Busca, serviços da plataforma, recentes e favoritos, Meus agendamentos e Agenda entram com busca e agendamento (semana 2). Ofertas não tem issue por enquanto.
- A tela do gerente chama-se **Gestão da barbearia** ("Painel" continua sendo o de métricas).

## Alternativas
- Seletor de visão (PR #23): modo explícito, mas exige cliques para trocar e esconde o que é do usuário.
- Atalhos das barbearias no cabeçalho: navegação direta, mas ocupa o topo de todas as telas e não acomoda o feed de cliente.

## Consequências
- `GET /me` (ou consulta equivalente) precisa devolver as barbearias em que o usuário é gerente e seus vínculos; o backend da #23 é reaproveitado, a store e o seletor são descartados.
- Barbeiro ganha uma página de leitura do vínculo (nova rota escopada ao próprio barbeiro).
- O layout das páginas atuais passa para dentro da casca com navbar.
