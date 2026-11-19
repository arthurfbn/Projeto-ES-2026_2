# Design system — Shavey

> Identidade visual definida no canvas de marca (https://claude.ai/artifact/5Khf9m9rmC3nFQFEtFkP6f, prancha "Shavey"). Este documento traduz a marca em regras e tokens para o frontend (ADR-0005). Em caso de conflito, o canvas é a referência visual e este arquivo é a referência de implementação.

## Conceito
Uma **maquininha de cortar inclinada**, como na mão do barbeiro, com o pente no topo, o fio saindo da base e as **duas listras do poste de barbearia** só na pegada: dá o recado de barbearia sem virar clichê. O nome se lê "xávêi" ou "xêivi" — tanto faz.

## Marca
| Peça | Uso | Arquivo |
|---|---|---|
| Símbolo + wordmark `shavey` | cabeçalho, login, landing | (montar com o SVG + texto em Bricolage Grotesque 800) |
| Símbolo sobre fundo claro | favicon, avatares de sistema | [`brand/shavey-simbolo.svg`](brand/shavey-simbolo.svg) |
| Símbolo negativo (sobre marinho) | ícone do app, splash, notificações | [`brand/shavey-simbolo-negativo.svg`](brand/shavey-simbolo-negativo.svg) |

- Wordmark sempre em **minúsculas**: `shavey`, com o **y** destacado — em latão sobre marinho, em vermelho poste sobre fundo claro, em papel sobre latão.
- Ícone do app: símbolo negativo num quadrado marinho com cantos arredondados (raio ≈ 22% do lado). Tamanhos de referência: 1024, 64 e 32 px; em 32 px usar a versão sobre latão.
- Versão monocromática (#141414 sobre branco) para impressão em uma cor.
- Símbolo sempre inclinado (−24°); não endireitar, espelhar ou trocar as cores das listras.

## Cores
| Token | Nome | Hex | Papel na interface |
|---|---|---|---|
| `navy` | Marinho | `#17293F` | cor principal: texto, botões primários, cabeçalhos, fundos de destaque |
| `brass` | Latão | `#C9973F` | acento da marca: detalhes, foco, chips, estados selecionados, fundos de destaque |
| `pole-red` | Vermelho poste | `#B83A2B` | acento secundário e **erro/destrutivo** |
| `paper` | Papel | `#F4EDE1` | fundo da aplicação |
| `white` | Branco | `#FFFFFF` | cartões e superfícies |
| `line` | Borda | `#E2D6C2` | bordas e divisores |
| `ink-muted` | Texto secundário | `#4D5C6E` | legendas, metadados |

Variações de latão aprovadas no canvas: `#D9B26A` (claro) e `#B8862F` (escuro).

### Contraste (WCAG 2.1)
| Combinação | Contraste | Uso permitido |
|---|---|---|
| Marinho sobre papel / branco | 12,7 / 14,7 | qualquer texto |
| Papel sobre marinho | 12,7 | qualquer texto |
| Marinho sobre latão / latão sobre marinho | 5,6 | qualquer texto |
| Texto secundário sobre papel / branco | 5,9 / 6,8 | qualquer texto |
| Vermelho poste sobre papel / branco | 4,9 / 5,7 | texto de erro, links destrutivos |
| Branco sobre vermelho poste | 5,7 | botão destrutivo |
| **Latão sobre papel / branco** | **2,3 / 2,6** | **proibido para texto**; só decoração, bordas grossas e ícones grandes acompanhados de texto |

## Tipografia
| Uso | Fonte | Peso | Notas |
|---|---|---|---|
| Títulos, wordmark, números de painel, botões primários | **Bricolage Grotesque** | 800 (600 para subtítulos) | `letter-spacing: -0.02em` em títulos grandes (−0.04em no wordmark) |
| Texto, formulários, tabelas | **Inter** | 400 / 600 | números de tabela com `font-variant-numeric: tabular-nums` |

Escala sugerida (rem): 0.8125 legenda · 0.875 pequeno · 1 corpo · 1.25 · 1.5 · 2 · 2.625 título de página.

## Forma e espaçamento
- Raios: **12 px** botões e inputs · **16 px** cartões pequenos · **20 px** cartões · **28 px** painéis de destaque · `999px` chips.
- Botão primário: 52 px de altura em mobile (mín. 44 px de área de toque), fundo marinho, texto papel em Bricolage 800.
- Superfícies: fundo papel; cartões brancos com borda `line` de 1 px; sem sombras pesadas nem gradientes.
- Espaçamento em múltiplos de 4 px.

## Voz
Direta, leve, com vocabulário de barbearia. Frases curtas; tuteia o cliente.
- Taglines: "Passa a máquina na fila." · "Book it. Sit. Shavey." · "Agenda zerada, cabeça leve" · "Máquina ligada, horário marcado"
- Exemplo de lembrete: "Máquina ligada: teu corte com o Léo é hoje às 15h."
- Mensagens de erro e dinheiro (cobrança, reembolso, comissão) são **sóbrias e exatas**: nada de piada perto de valores.

## Tokens para o frontend
Arquivo único `apps/web/src/styles/tokens.css` (Tailwind v4 + shadcn-vue). Componentes usam só as classes derivadas (`bg-primary`, `text-muted-foreground`, `border-border`…), nunca hex.

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;600&display=swap');

:root {
  /* marca */
  --shavey-navy: #17293F;
  --shavey-brass: #C9973F;
  --shavey-brass-light: #D9B26A;
  --shavey-brass-dark: #B8862F;
  --shavey-pole-red: #B83A2B;
  --shavey-paper: #F4EDE1;
  --shavey-line: #E2D6C2;
  --shavey-ink-muted: #4D5C6E;

  /* papéis semânticos (shadcn-vue) */
  --background: var(--shavey-paper);
  --foreground: var(--shavey-navy);
  --card: #FFFFFF;
  --card-foreground: var(--shavey-navy);
  --popover: #FFFFFF;
  --popover-foreground: var(--shavey-navy);
  --primary: var(--shavey-navy);
  --primary-foreground: var(--shavey-paper);
  --secondary: #FFFFFF;
  --secondary-foreground: var(--shavey-navy);
  --accent: var(--shavey-brass);
  --accent-foreground: var(--shavey-navy);
  --muted: #EDE3D3;
  --muted-foreground: var(--shavey-ink-muted);
  --destructive: var(--shavey-pole-red);
  --destructive-foreground: #FFFFFF;
  --border: var(--shavey-line);
  --input: var(--shavey-line);
  --ring: var(--shavey-brass);
  --radius: 12px;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-navy: var(--shavey-navy);
  --color-brass: var(--shavey-brass);
  --color-pole-red: var(--shavey-pole-red);
  --color-paper: var(--shavey-paper);
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Bricolage Grotesque', 'Inter', sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
}
```

`--muted` (`#EDE3D3`) é um tom derivado do papel para fundos de campos desabilitados e linhas zebradas; não está no canvas e pode ser ajustado.

## Fora do MVP
Tema escuro, ilustrações e mascote animado.
