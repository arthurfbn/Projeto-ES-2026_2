# ODS 8 — Trabalho Decente e Crescimento Econômico

## Definição
A ODS 8 da ONU busca promover o crescimento econômico sustentado, inclusivo e sustentável, o emprego pleno e produtivo e o **trabalho decente para todos**.

## Por que o Shavey se encaixa
O setor de barbearias é majoritariamente informal no Brasil: acordos de comissão verbais e instáveis, dificuldade de comprovar jornada e ganhos e conflitos de horário para quem trabalha em vários estabelecimentos. O Shavey atende várias barbearias ao mesmo tempo e foi pensado em torno da **relação de trabalho do barbeiro**: registra o vínculo, protege a remuneração acordada e previne sobrecarga e conflito de jornada.

O diferencial é que esses princípios estão **no próprio modelo de dados e nas regras do sistema** — a ODS não é colada por cima do projeto.

## Metas relevantes
- **8.3** — formalização e crescimento de micro e pequenas empresas e empreendedorismo.
- **8.5** — emprego pleno e produtivo e trabalho decente, com remuneração justa.
- **8.8** — proteção dos direitos trabalhistas e ambientes de trabalho seguros.

## Rastreabilidade: meta → modelo → funcionalidade
| Meta | Modelo | Funcionalidade no MVP |
|---|---|---|
| 8.3 Formalização | `barber_memberships` (hired_at, approved_by, is_active), papéis de gerente | Vínculo formal barbeiro ↔ barbearia; barbeiro sem barbearia abre a própria |
| 8.5 Remuneração justa e transparente | `commission_rules` (tipo, valor, vigência), `commission_entries`, `appointments.price_snapshot`, `payments` (todo pagamento registrado, inclusive dinheiro) | Painel do barbeiro com faturamento, comissões, gorjetas e ticket médio; contestação de pagamento presencial |
| 8.8 Proteção da jornada | `barber_memberships` (allowed_shift, is_accepting), `barber_availability` | Disponibilidade por barbearia sem sobreposição; agenda sem conflito entre barbearias |
| 8.5 Proteção da renda | política de cancelamento, cobrança em aberto, bloqueio | Cancelamento tardio e não comparecimento não ficam como prejuízo do barbeiro |

## Frase-síntese
> O Shavey não apenas gerencia agendamentos: foi modelado para formalizar e dar transparência à relação de trabalho do barbeiro — registrando vínculos, protegendo a remuneração acordada e prevenindo sobrecarga de jornada — em linha com as metas 8.3, 8.5 e 8.8 da ODS 8.

## ODS consideradas e descartadas
- **ODS 12** (consumo responsável): exigiria controle de insumos, fora do modelo.
- **ODS 3** (saúde e bem-estar): periférica ao núcleo do sistema.
