---
name: grill-barbearia
description: Use antes de implementar qualquer funcionalidade nova ou mudança de regra do sistema de barbearias — interroga a dupla até fechar as regras de domínio e registra a linguagem em docs/CONTEXT.md e decisões em docs/adr/.
---

# Grill do domínio (discovery antes de código)

Objetivo: transformar uma ideia vaga ("o cliente pode remarcar") em entendimento compartilhado e verificável ANTES de qualquer código. Plausível não é correto: não invente regras de negócio.

## Quando usar
- Toda feature nova ou mudança de regra (agendamento, cancelamento, comissão, pagamento, avaliação, painel ODS 8).
- Sempre que um termo aparecer com dois sentidos. Linguagem confusa → pare o código e modele o domínio.

## Processo
1. Leia `docs/CONTEXT.md`, `docs/adr/` e `apps/api/prisma/schema.prisma`. Não pergunte o que já está decidido.
2. Monte a árvore de decisões da feature e pergunte em ordem de dependência: uma pergunta por vez (no máximo 3 relacionadas), cada uma com sua recomendação e o porquê. Prefira a opção mais simples que caiba no prazo do MVP (ADR-0010).
3. Cubra sempre: quem pode (papel + barbearia), quando pode (janelas de tempo, fuso America/Sao_Paulo), estados e transições, dinheiro (pagamento, estorno, comissão, gorjeta), conflitos de horário, efeitos colaterais, erros e o que fica FORA de escopo.
4. Termo novo ou ambíguo → proponha o termo canônico e atualize `docs/CONTEXT.md` na hora (remova a marca "(a confirmar)" quando a dupla confirmar).
5. Decisão difícil de reverter ou com alternativas reais → escreva um ADR (`docs/adr/NNNN-titulo.md`, próximo número livre).
6. Feche com um resumo: regras decididas, critérios de aceite em Given/When/Then, fora de escopo, perguntas em aberto. Próximo passo: skill `spec-e-tickets`.

## Formato do CONTEXT.md
```md
**Agendamento** (Appointment)
Reserva de um serviço com um barbeiro, em uma barbearia, num intervalo de tempo.
_Evitar_: reserva, booking, marcação
```

## Não faça
- Não escreva código, migrations ou telas durante o grill.
- Não preencha lacunas com "o que sistemas de barbearia costumam fazer": pergunte.
- Não registre como decidido o que a dupla não confirmou.
