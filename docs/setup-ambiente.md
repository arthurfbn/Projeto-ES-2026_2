# Setup do ambiente — Shavey

Checklist para deixar contas, máquinas e segredos prontos antes do primeiro código. Marque cada item ao concluir. Menus de serviços externos mudam com frequência: se um nome não bater, procure a opção equivalente.

Legenda: **[A]** Arthur · **[B]** Bruno · **[A+B]** os dois

Tudo aqui é **gratuito** e não pede cartão de crédito (ADR-0015).

---

## 1. Marca [A] (sem custo)

> Domínio próprio fica para depois do MVP (ADR-0015). O app roda em `*.vercel.app`.

1. Busque "SHAVEY" no INPI (busca.inpi.gov.br → Marca), em Radical e Exata, olhando as classes 9, 42 e 35. Anote se aparecer algo.
2. Procure `shavey`, `shaveyapp` e `shavey.app` no Instagram; se estiver livre, crie a conta para reservar o nome.

## 2. GitHub [A]

> ✅ 2.1 e 2.2 concluídos em 16/11.

### 2.1 Adicionar o Bruno
1. Repositório → **Settings → Collaborators** → **Add people**.
2. Busque o usuário do Bruno e envie o convite. Ele precisa aceitar pelo e-mail ou em github.com/notifications.

### 2.2 Proteção contra vazamento de segredos (obrigatório: repo público)
1. **Settings → Code security** (ou "Advanced Security").
2. Ative **Secret scanning** e **Push protection**.
3. Ative **Dependabot alerts** e **Dependabot security updates**.

### 2.3 Proteção da `main` (fazer depois que o CI existir)
1. **Settings → Rules → Rulesets → New branch ruleset**, alvo `main`.
2. Marque: **Require a pull request before merging**, **Require status checks to pass** (selecionar o job do CI quando existir), **Block force pushes**.
3. Para o Ship/Show (ADR-0009), deixe "Required approvals" em **0**; a revisão do Ask é combinada entre vocês.

### 2.4 Labels para as issues
Com o `gh` instalado (seção 7), na pasta do repo:
```bash
gh label create feature --color 0E8A16
gh label create ask --color B83A2B --description "Revisão obrigatória antes do merge"
gh label create show --color C9973F --description "Merge após CI, revisão depois"
gh label create ship --color 17293F --description "Trivial"
gh label create identidade --color BFD4F2
gh label create barbearias --color BFD4F2
gh label create agenda --color BFD4F2
gh label create pagamentos --color BFD4F2
gh label create comissoes --color BFD4F2
gh label create infra --color D4C5F9
```

---

## 3. Railway (API + Postgres) [B]

> Conta do Bruno, no trial gratuito (ADR-0016).

1. Bruno entra em railway.com com o GitHub dele e anota **a data de início do trial** e o crédito restante (**Account → Usage**).
2. **New Project → Database → PostgreSQL**. Renomeie o projeto para `shavey`.
3. Convide o Arthur em **Project Settings → Members**, se o plano permitir.
4. O serviço da API é criado depois do scaffold:
   - **New → GitHub Repo → Projeto-ES-2026_2** (o Bruno precisa autorizar o Railway a ver o repositório do arthurfbn);
   - **Settings → Source → Root Directory**: deixe a raiz do repositório (o monorepo precisa do workspace inteiro);
   - **Settings → Config-as-code → Railway Config File**: `/apps/api/railway.json` (build, migrations no pre-deploy, start e healthcheck `/health`);
   - **Variables**: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`, `NODE_ENV = production` e as demais da seção 9;
   - **Settings → Networking → Generate Domain**: sai a URL `*.up.railway.app`. Cole essa URL em `apps/web/vercel.json`, no lugar de `TROCAR-PELA-URL-DA-API`, e faça um PR.
5. Toda semana, confira **Usage**. Se o trial for acabar antes de 07/12, aplique o plano B.

## 4. Plano B: Neon + Render (só se o trial do Railway acabar)

1. **Neon** (neon.tech, conta GitHub, plano Free): projeto `shavey`; guarde as strings **pooled** (`DATABASE_URL`) e **direta** (`DIRECT_URL`).
2. **Render** (render.com, plano Free): **New → Web Service → Projeto-ES-2026_2**, instância Free, Health Check `/health`, mesmas variáveis. Dorme após 15 min sem uso.
3. Exporte os dados do Railway com `pg_dump` e importe no Neon com `psql`.
4. Troque a URL da API no `apps/web/vercel.json`.

## 5. Vercel (web gratuita) [A]

1. Crie a conta em vercel.com → **Continue with GitHub** (conta arthurfbn), plano **Hobby**.
2. Ao pedir acesso ao GitHub, escolha **Only select repositories → Projeto-ES-2026_2**.
3. O projeto é importado no scaffold, quando existir `apps/web`: **Add New → Project → Projeto-ES-2026_2**, **Root Directory** = `apps/web`, framework **Vite** (a Vercel detecta o pnpm e o workspace; deixe ligada a opção de incluir arquivos fora da pasta raiz). Em **Settings → Domains**, ajuste o subdomínio gratuito para algo como `shavey.vercel.app` (se estiver livre).
4. O `apps/web/vercel.json` (criado no scaffold) faz o proxy `/api/*` → URL da API no Railway. É isso que mantém o cookie de sessão funcionando sem domínio próprio.
5. Se commits do Bruno forem barrados ("commit author não tem acesso"), siga o plano B do ADR-0009 (deploy via GitHub Actions com `VERCEL_TOKEN`).

## 5b. Stripe (pagamentos em teste) [A]

1. Crie a conta em dashboard.stripe.com/register, país **Brasil**. Não ative a conta para pagamentos reais: tudo em **modo teste / sandbox**.
2. **Developers → API keys** (modo teste): anote `pk_test_...` e `sk_test_...`.
3. **Settings → Branding**: nome "Shavey", cor primária `#17293F`, destaque `#C9973F`, ícone exportado de `docs/brand/shavey-simbolo-negativo.svg` como PNG.
4. Convide o Bruno em **Settings → Team** (papel Developer).
5. O webhook (`https://<api>.up.railway.app/webhooks/payments/stripe`) é criado na semana 2.

## 6. Sentry (erros) [A ou B]

1. Crie a conta em sentry.io (plano Developer, gratuito) e uma organização `shavey`.
2. **Projects → Create project**:
   - plataforma **Vue** → nome `shavey-web`;
   - plataforma **Node.js** (ou Fastify, se aparecer) → nome `shavey-api`.
3. Anote o **DSN** de cada um (Project Settings → Client Keys).
4. Convide o outro em **Settings → Members**.

---

## 7. Ferramentas na máquina [A+B] — ✅ concluído (Arthur)

### Windows (PowerShell)
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
winget install GitHub.cli
winget install Microsoft.VisualStudioCode
```
- **Stripe CLI:** baixe o `.zip` para Windows em github.com/stripe/stripe-cli/releases, extraia `stripe.exe` numa pasta (ex.: `C:\tools\stripe`) e adicione essa pasta ao `PATH`. (Ou `scoop install stripe` se usar Scoop.)
- Docker Desktop no Windows exige **WSL 2**: aceite a instalação quando ele pedir e reinicie.

### macOS (Homebrew)
```bash
brew install git node gh stripe/stripe-cli/stripe
brew install --cask docker visual-studio-code
```

### Linux (Debian/Ubuntu)
Node via nvm (`nvm install --lts`), Docker Engine pelo repositório oficial, `gh` e Stripe CLI pelos repositórios apt indicados nas documentações oficiais.

### Depois de instalar (todos os sistemas)
```bash
node -v                 # deve mostrar a LTS atual (v24.x ou superior)
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
docker run --rm hello-world   # confirma que o Docker funciona
gh auth login           # GitHub.com → HTTPS → login pelo navegador, com a conta certa
stripe login            # abre o navegador e pareia com a conta Stripe
```

### Claude Code
Instale seguindo a documentação oficial (docs.claude.com → Claude Code → instalação) e faça login. Ao abrir dentro da pasta do repositório, ele carrega o `CLAUDE.md` e as skills de `.claude/skills/` automaticamente.

### VS Code — extensões
Vue (Official) · Tailwind CSS IntelliSense · ESLint · Prettier · Prisma · Playwright Test · EditorConfig · GitLens (opcional)

---

## 8. Git com a conta certa [A+B] — ✅ concluído (Arthur)

Na pasta do repositório (vale só para ele):
```bash
git config user.name "Seu Nome"
git config user.email "email-da-sua-conta-github"
git config pull.rebase true          # trunk-based: rebase em vez de merge ao puxar
git config core.autocrlf input       # Windows: evita diffs de fim de linha (use "true" se preferir CRLF no editor)
```
Confira: `git config user.email`.

---

## 9. Segredos [A]

Guarde num gerenciador de senhas compartilhado (ex.: Bitwarden com uma coleção "Shavey" para os dois). **Nunca** em arquivo do repositório, issue, PR ou chat.

| Variável | Onde vai | Como obter |
|---|---|---|
| `DATABASE_URL` | Railway (API) | `${{Postgres.DATABASE_URL}}` |
| `SESSION_SECRET` | Railway (API) | gerar (abaixo) |
| `STRIPE_SECRET_KEY` | Railway (API) | Stripe → API keys (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Railway (API) | semana 2, ao criar o webhook (`whsec_...`) |
| `SENTRY_DSN` | Railway (API) | Sentry → `shavey-api` |
| `API_URL` (rewrite) | `apps/web/vercel.json` | URL `*.up.railway.app` (não é segredo) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Vercel (web) | Stripe (`pk_test_...`) |
| `VITE_SENTRY_DSN` | Vercel (web) | Sentry → `shavey-web` |

Gerar o `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Variáveis `VITE_*` são públicas (vão para o navegador): nunca coloque segredo nelas.

---

## 10. Alinhamento da dupla (30 min) [A+B]

1. Bruno lê antes: `README.md`, `CLAUDE.md`, `docs/CONTEXT.md`, `docs/design-system.md` e ADRs 0011–0014. Discordâncias viram conversa agora, não depois do código.
2. Combinem:
   - sincronização diária curta (ex.: 15 min, horário fixo);
   - prazo de revisão de PR "Ask": no mesmo dia;
   - canal para avisar "main quebrou" (prioridade zero).
3. Divisão inicial da semana 1:
   - **Arthur:** scaffold do monorepo + CI + walking skeleton (API `/health` no Railway ↔ página na Vercel via `/api`).
   - **Bruno:** schema Prisma completo + seed, a partir do `CONTEXT.md`.
   - Depois: fatias de cadastro/login/visões e cadastro de barbearia, alternadas.
4. Criem as issues da semana 1 (skill `spec-e-tickets`) e atribuam.

---

## Pronto para começar quando
- [ ] Bruno aceitou o convite do repositório
- [ ] Secret scanning e push protection ativos
- [ ] Postgres criado no Railway do Bruno (data de fim do trial anotada)
- [ ] Conta Vercel ligada ao repositório
- [ ] Chaves de teste do Stripe guardadas
- [ ] DSNs do Sentry guardados
- [ ] `node`, `pnpm`, `docker`, `gh`, `stripe` funcionando nas duas máquinas
- [ ] Git configurado com a conta certa nas duas máquinas
- [ ] Issues da semana 1 criadas
