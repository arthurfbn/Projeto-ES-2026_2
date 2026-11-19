<p align="center"><img src="docs/brand/shavey-simbolo.svg" alt="Símbolo da Shavey: maquininha de cortar inclinada" width="96"></p>

<h1 align="center">shavey</h1>

<p align="center"><em>Passa a máquina na fila.</em></p>

> Agendamento e gestão de barbearias com transparência para quem corta cabelo. MVP desenvolvido na disciplina de Engenharia de Software (UNIFESP · ICT · 2026/2), pensado como base de um produto comercial: **site primeiro, app depois**.

![status](https://img.shields.io/badge/status-em%20planejamento-yellow)

## Sumário
- [Problema](#problema)
- [O que o MVP entrega](#o-que-o-mvp-entrega)
- [Diferenciais](#diferenciais)
- [Impacto social — ODS 8](#impacto-social--ods-8)
- [Identidade visual](#identidade-visual)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Como trabalhamos](#como-trabalhamos)
- [Documentação](#documentação)
- [Equipe](#equipe)

## Problema
O setor de barbearias é majoritariamente informal: agendas no WhatsApp e no caderno, acordos de comissão verbais e instáveis, dificuldade de comprovar jornada e ganhos e conflitos de horário para barbeiros que trabalham em mais de um lugar. Cancelamentos de última hora e faltas viram prejuízo direto do barbeiro.

O Shavey atende várias barbearias ao mesmo tempo e foi desenhado em torno da relação de trabalho do barbeiro.

## O que o MVP entrega
Uma mesma conta pode atuar em três perfis, alternando entre visões:

| Perfil | O quê |
|---|---|
| **Cliente** | Encontrar barbearias, escolher serviço e barbeiro, agendar um horário livre, pagar online ou no local, cancelar seguindo a política, avaliar o atendimento |
| **Gerente** | Cadastrar a barbearia, serviços (preço e duração padrão), vínculos com barbeiros (com preço e duração por barbeiro) e regras de comissão; acompanhar a agenda; registrar pagamentos no local; decidir contestações; painel por barbearia e geral com faturamento, resultado, margem, comissões, cancelamentos e não comparecimentos |
| **Barbeiro** | Definir disponibilidade por barbearia, ver uma agenda única entre barbearias, conduzir atendimentos e acompanhar um painel de faturamento gerado, comissão, gorjetas, margem, ticket médio e avaliações, com filtros por período, cliente e barbearia |

**Regras centrais:** horários em passos de 15 min sem conflito entre barbearias · pagamento online (confirma ao pagar) ou no local (confirma na hora) · cancelamento sem custo até 24h antes e com reembolso de 75%, 50% ou 25% conforme a proximidade (nada com 1h ou menos; agendamentos feitos para menos de 24h depois reembolsam tudo até 1h antes) · cancelamento ou falta sem pagamento gera cobrança em aberto que impede agendar em qualquer barbearia · todo pagamento, inclusive em dinheiro, é registrado e pode ser contestado.

Cronograma: [`docs/plano-mvp.md`](docs/plano-mvp.md) — 3 semanas, apresentação em 07/12/2026.

## Diferenciais
A agenda online, o lembrete e o controle de comissão já são comuns no mercado. O Shavey se diferencia por ser desenhado em torno do **barbeiro como trabalhador**, e não apenas do dono do estabelecimento:

1. **Um barbeiro, várias barbearias, uma agenda.** O mesmo profissional atende em mais de uma barbearia com uma conta só; o sistema impede conflito de horário *entre* barbearias, inclusive no banco de dados.
2. **Comissão transparente para quem recebe.** Regras percentuais, fixas ou escalonadas, com vigência, ficam visíveis para o barbeiro, que acompanha sua comissão atualizada a cada atendimento. A escalonada é marginal: passar de faixa nunca diminui o que já foi ganho.
3. **Vínculo de trabalho formalizado.** Data de contratação, aprovação, exclusividade, turno e serviços/preços por barbeiro ficam registrados — histórico que o barbeiro pode usar para comprovar trabalho e renda.
4. **Proteção da renda contra cancelamentos e faltas.** Política de cancelamento por faixas aplicada automaticamente, com reembolso parcial no pagamento online e **cobrança em aberto** quando o cliente não pagou.
5. **Inadimplência vale para a rede inteira.** Cliente com cobrança em aberto não agenda em *nenhuma* barbearia da plataforma até quitar — algo que um sistema de barbearia isolada não consegue fazer.
6. **Todo pagamento conta, inclusive em dinheiro.** Pagamentos no local são registrados no app, com contestação mediada pelo gerente, de modo que comissão e faturamento refletem a realidade.
7. **Preço congelado.** Mudanças de tabela não alteram o que foi combinado em agendamentos já feitos.
8. **Uma conta, vários papéis.** A mesma pessoa pode ser cliente, barbeiro e gerente, alternando visões, sem cadastros duplicados.

> Diferenciais ainda a validar com barbearias e barbeiros reais — parte dos próximos passos do produto.

## Impacto social — ODS 8
Alinhado à **ODS 8 — Trabalho Decente e Crescimento Econômico**, metas 8.3, 8.5 e 8.8: o sistema formaliza o vínculo barbeiro ↔ barbearia, torna a remuneração (comissões, gorjetas, preço congelado) transparente e rastreável, protege a renda contra cancelamentos tardios e evita sobrecarga e conflito de jornada. A ODS está no modelo de dados, não colada por cima. Detalhes e rastreabilidade em [`docs/ods.md`](docs/ods.md).

## Identidade visual
A marca é uma **maquininha de cortar inclinada**, como na mão do barbeiro, com as duas listras do poste de barbearia na pegada. Wordmark `shavey` em minúsculas.

| Marinho | Latão | Vermelho poste | Papel |
|---|---|---|---|
| `#17293F` | `#C9973F` | `#B83A2B` | `#F4EDE1` |

- **Tipografia:** Bricolage Grotesque 800 nos títulos, Inter 400/600 no texto.
- **Forma:** cartões brancos sobre fundo papel, bordas `#E2D6C2`, cantos arredondados (12–28 px), sem gradientes.
- **Voz:** direta e leve, com vocabulário de barbearia ("Máquina ligada, horário marcado"); sóbria quando o assunto é dinheiro.
- **Acessibilidade:** latão nunca é cor de texto sobre fundo claro (contraste 2,3:1).

Guia completo, tabela de contraste e tokens do Tailwind: [`docs/design-system.md`](docs/design-system.md).

## Stack
| Camada | Tecnologia | Hospedagem |
|---|---|---|
| Web | Vue 3, Vite, TypeScript, Vue Router, Pinia, TanStack Query, Tailwind v4, shadcn-vue | Vercel (preview por PR) |
| API | Node.js, Fastify 5, TypeScript, Zod, Prisma, pino | Railway (trial gratuito), servida pela Vercel em `/api` |
| Banco | PostgreSQL | Railway |
| Pagamentos | Stripe Checkout (modo teste) | — |
| Testes | Vitest, Vue Test Utils, MSW, Playwright | GitHub Actions |
| Erros | Sentry | — |

Monorepo com **pnpm workspaces**. Toda a infraestrutura roda em planos gratuitos ([ADR-0015](docs/adr/0015-hospedagem-gratuita.md), [ADR-0016](docs/adr/0016-api-e-banco-no-railway-conta-bruno.md)). Justificativas em [`docs/adr/`](docs/adr/).

## Arquitetura
Monólito modular com **Functional Core / Imperative Shell** ([ADR-0003](docs/adr/0003-monolito-modular-functional-core.md)):

```
Web (Vue)  ──HTTP + cookie de sessão──▶  API (Fastify)
                                          ├─ identidade
                                          ├─ barbearias
                                          ├─ agenda
                                          ├─ pagamentos ──▶ Stripe (webhook)
                                          └─ comissoes
                                               │
                                          PostgreSQL
```
- Cada módulo: `core/` (regras puras e testáveis) → `app/` (casos de uso) → `adapters/` (Prisma, Stripe) → `http/` (rotas).
- Contratos de API (schemas Zod) compartilhados entre web e API em `packages/contracts`.
- Garantias críticas também no banco (ex.: constraint que impede agendamentos sobrepostos do mesmo barbeiro).

## Estrutura do repositório
```
apps/
  web/                 frontend Vue
  api/                 API Fastify + Prisma
packages/
  contracts/           schemas Zod compartilhados
docs/
  CONTEXT.md           linguagem do domínio
  adr/                 decisões de arquitetura
  specs/               especificações de features
  plano-mvp.md         cronograma
.claude/
  skills/              skills de desenvolvimento assistido por IA
CLAUDE.md              regras do projeto para agentes de IA
```
> `apps/` e `packages/` serão criados no scaffold (semana 1).

## Como rodar
> Em construção — será preenchido com o scaffold.

Pré-requisitos previstos: Node.js 22+, pnpm, Docker (Postgres local) e Stripe CLI.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # preencher variáveis
docker compose up -d                     # Postgres local
pnpm db:migrate && pnpm db:seed
pnpm dev                                 # web + api
```

| Comando | O que faz |
|---|---|
| `pnpm dev` | web e API em modo desenvolvimento |
| `pnpm lint` / `pnpm typecheck` | qualidade estática |
| `pnpm test` | testes de unidade |
| `pnpm test:int` | testes de integração com Postgres |
| `pnpm e2e` | testes end-to-end (Playwright) |
| `stripe listen --forward-to localhost:3333/webhooks/stripe` | webhooks do Stripe em desenvolvimento |

## Como trabalhamos
Fluxo baseado no conteúdo da disciplina e apoiado por IA:

```
Ideia → Grill (discovery) → CONTEXT.md + ADR → Spec → Issues em fatias verticais → TDD → PR → CI → Deploy → Métricas
```
- **Git:** trunk-based, branches curtas, Conventional Commits, PRs Ship/Show/Ask ([ADR-0009](docs/adr/0009-fluxo-git-e-ci.md)).
- **CI:** lint, typecheck, testes de unidade e integração e checagem de migrations em todo PR.
- **Testes:** pirâmide com foco no núcleo de regras ([ADR-0008](docs/adr/0008-estrategia-de-testes.md)).
- **Métricas:** DORA (frequência de deploy, lead time, taxa de falha, tempo de recuperação) e SLO de criação de agendamento.
- **IA:** regras em [`CLAUDE.md`](CLAUDE.md) e skills em [`.claude/skills/`](.claude/skills/).

## Documentação
- [Linguagem do domínio](docs/CONTEXT.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [ODS 8 e rastreabilidade](docs/ods.md)
- [Design system](docs/design-system.md)
- [Setup do ambiente](docs/setup-ambiente.md)
- [Plano do MVP](docs/plano-mvp.md)

## Equipe
| Pessoa | Atuação |
|---|---|
| Arthur Falcão Braga | Full stack — fatias verticais de ponta a ponta |
| Bruno | Full stack — fatias verticais de ponta a ponta |

Front, back, banco, deploy, testes e documentação são divididos entre os dois por fatia; cada PR de regra de negócio é revisado pelo outro.

## Licença
Código público para fins acadêmicos, **sem licença de código aberto**: todos os direitos reservados aos autores. Não é permitido copiar, modificar ou distribuir sem autorização.
