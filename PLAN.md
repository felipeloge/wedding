# Plan: Casamento Raíssa e Felipe — Wedding Platform

## TL;DR

Plataforma completa para o casamento (28/11/2026) com: website público (Astro), dashboard de gerenciamento (React 19 SPA), e cápsula do tempo (React SPA no subdomínio `feed`). Monorepo com pnpm workspaces, hospedado na Cloudflare, banco Supabase, pagamentos via Stripe, mensagens via Meta Cloud API (WhatsApp).

---

## Arquitetura Geral

```
raissaefelipe2026.com.br          → Astro (Cloudflare Pages)
dashboard.raissaefelipe2026.com.br → React SPA (Cloudflare Pages - projeto separado)
feed.raissaefelipe2026.com.br      → React SPA (Cloudflare Pages - projeto separado)
```

**Monorepo (pnpm workspaces)**:
```
wedding/
├── apps/
│   ├── web/              # Astro - website principal
│   ├── dashboard/        # React 19 SPA - painel de gerenciamento
│   └── feed/             # React 19 SPA - cápsula do tempo
├── packages/
│   ├── supabase/         # Supabase client, types, migrations
│   ├── ui/              # Componentes compartilhados (se necessário)
│   └── config/          # ESLint, TypeScript configs compartilhados
├── supabase/             # Supabase CLI: migrations, seed, edge functions
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Stack Definida

| Camada | Tecnologia |
|--------|-----------|
| Website público | Astro + @astrojs/cloudflare + @astrojs/react (islands) |
| Dashboard | React 19 + TanStack Router + TanStack Query + Shadcn/ui + Tailwind CSS |
| Cápsula do tempo (feed) | React 19 + TanStack Router + TanStack Query + Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL + RLS + Realtime) |
| Auth (dashboard) | Supabase Auth (email/password para o casal) |
| Auth (feed) | Custom: validação via UUID do convidado na URL + verificação no banco |
| Pagamentos | Stripe Checkout (PIX, cartão crédito c/ parcelamento, débito) |
| Upload de arquivos | Cloudflare R2 (zero egress, $0.015/GB/mês) |
| Mensagens WhatsApp | Meta Cloud API (WhatsApp Business) |
| Hospedagem | Cloudflare Pages (3 projetos) + Pages Functions (API routes) |
| Monorepo | pnpm workspaces + Turborepo |

---

## Decisão: Cloudflare R2 para uploads

**Justificativa**: Custo zero de egress (download) é crucial para um feed onde muitos convidados visualizarão fotos/vídeos. Para ~50-100GB estimados:
- R2: ~$0.75-$1.50/mês (storage) + operações
- Supabase Storage: mais caro e com egress cobrado

Acesso controlado via **signed URLs** gerados pelo backend (Supabase Edge Functions ou Pages Functions).

---

## Decisão: Cápsula do Tempo como React SPA separado

**Justificativa**: O feed é essencialmente um app independente com autenticação própria, upload de mídia, e interatividade constante. Usar o mesmo stack do dashboard (React 19 + TanStack) permite reutilizar pacotes do monorepo e manter consistência, mas em um deploy separado no subdomínio `feed`.

---

## Schema do Banco de Dados (Supabase)

```sql
-- Itens da lista de presentes
CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pagamentos (populado via Stripe webhook)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID REFERENCES gifts(id),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'brl',
  payment_method TEXT, -- 'pix', 'credit_card', 'debit_card'
  installments INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Convidados
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  observations TEXT,
  rsvp_status TEXT DEFAULT 'pending', -- pending, confirmed, declined
  rsvp_confirmed_at TIMESTAMPTZ,
  short_url_code TEXT UNIQUE,
  feed_access_granted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Acompanhantes dos convidados
CREATE TABLE guest_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens enviadas via WhatsApp (log)
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id),
  template_name TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Posts do feed (cápsula do tempo)
CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id),
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image', 'video'
  caption TEXT,
  is_time_capsule BOOLEAN DEFAULT false, -- true = visível apenas após 1 ano
  visible_after TIMESTAMPTZ, -- data após a qual o post fica visível (casamento + 1 ano)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## FASE 1 — Website + Dashboard Inicial

### Steps

**A. Setup do Monorepo**

1. Inicializar monorepo com pnpm workspaces + Turborepo
2. Configurar TypeScript, ESLint, Prettier compartilhados em `packages/config`
3. Configurar Supabase CLI local (`supabase/`) com migrations iniciais (tabelas `gifts`, `payments`)
4. Criar package `packages/supabase` com client tipado (gerado via `supabase gen types`)

**B. Website Astro (`apps/web`)**

5. Criar projeto Astro com adapter Cloudflare e integração React
6. Implementar layout principal com header sticky (logo centralizado + menu hamburger)
7. Implementar página principal (`/`) com seções:
   - Hero: foto de capa + countdown (dias/horas para 28/11/2026)
   - Carrossel de fotos do pré-wedding
   - Localização (mapa embed)
   - Onde se hospedar
   - CTA para lista de presentes
8. Implementar página `/presentes` — lista de presentes (fetch do Supabase, renderização com React island)
9. Implementar página `/checkout/[id]` — checkout Stripe para item selecionado
10. Criar API route `/api/stripe-webhook` — recebe webhooks do Stripe e popula tabela `payments`
11. Criar API route `/api/create-checkout-session` — cria sessão Stripe Checkout com PIX + cartão

**C. Dashboard React (`apps/dashboard`)**

12. Criar projeto React 19 com Vite + TanStack Router (file-based) + TanStack Query + Shadcn/ui + Tailwind
13. Implementar autenticação com Supabase Auth (email/password, apenas para o casal)
14. Implementar layout com sidebar (navegação: Presentes, Pagamentos)
15. Página "Lista de Presentes" — CRUD completo:
    - Listagem em tabela/cards
    - Formulário de cadastro (nome, descrição, preço, imagem)
    - Upload de imagem do item para R2 (via signed URL)
    - Editar / Excluir item
16. Página "Pagamentos" — visualização dos pagamentos:
    - Tabela com: item, comprador, valor, método, parcelas, status, data
    - Filtros por status e data
    - Dados vindos da tabela `payments` (populada via webhook)

**D. Deploy Cloudflare**

17. Configurar Cloudflare Pages para `apps/web` → `raissaefelipe2026.com.br`
18. Configurar Cloudflare Pages para `apps/dashboard` → `dashboard.raissaefelipe2026.com.br`
19. Configurar Cloudflare R2 bucket para uploads
20. Configurar variáveis de ambiente (Stripe keys, Supabase URL/anon key, R2 credentials)

---

## FASE 2 — Confirmação de Presença

### Steps

21. Criar migration Supabase para tabelas `guests`, `guest_companions`, `whatsapp_messages`
22. **Dashboard**: Implementar página "Convidados" — CRUD:
    - Formulário de cadastro: nome, celular, observações, sub-lista de acompanhantes (nome + celular)
    - Listagem em tabela com colunas: Nome, Acompanhantes, Celular, Status, Data confirmação, Ações
    - Busca por nome
    - Filtro por status (pendente/confirmado)
    - Botão exportar (CSV)
    - Ação: enviar mensagem WhatsApp
    - Ação: excluir convidado
23. Configurar Meta Cloud API:
    - Criar WhatsApp Business Account
    - Registrar número de telefone
    - Criar template de mensagem com link de confirmação
24. Implementar Supabase Edge Function `send-whatsapp` — envia template message via Meta Cloud API
25. Criar API route no website Astro `/api/confirm/[code]` — página de confirmação de presença:
    - Recebe short URL code
    - Exibe página com botão "Confirmar presença"
    - Ao clicar, atualiza `guests.rsvp_status` = 'confirmed' + `rsvp_confirmed_at`
26. Implementar geração de short URL code único por convidado (gerado no cadastro)

---

## FASE 3 — Cápsula do Tempo

### Steps

27. Criar projeto React 19 SPA (`apps/feed`) com TanStack Router + TanStack Query + Tailwind
28. Criar migration para tabela `feed_posts`
29. Implementar fluxo de autenticação:
    - Rota `/login`: input de celular → dispara Edge Function que envia link de acesso via WhatsApp
    - Rota `/feed/:guestId`: valida UUID no banco, verifica `rsvp_status = 'confirmed'`
    - Se não confirmou presença → mensagem de erro com instrução
    - Se confirmou → acesso liberado ao feed
30. Implementar Supabase Edge Function `send-feed-access-link` — envia link `feed.raissaefelipe2026.com.br/feed/{guestId}` via WhatsApp
31. Implementar página do Feed:
    - Tabs/navegação: "Feed" e "Cápsula do Tempo"
    - **Feed**: listagem de posts ordenados por data (mais recente primeiro), com mídia + caption + nome do convidado
    - **Cápsula do Tempo**: mesma interface de upload, mas posts marcados como `is_time_capsule = true` com `visible_after = 28/11/2027`
32. Implementar upload de mídia:
    - Componente de upload (imagem/vídeo)
    - Upload direto para R2 via signed URL (gerado por Edge Function)
    - Limite de tamanho: 50MB por arquivo (vídeos curtos)
    - Compressão client-side para imagens (antes do upload)
33. Deploy `apps/feed` → `feed.raissaefelipe2026.com.br` (Cloudflare Pages)

---

## Arquivos Principais (a serem criados)

- `pnpm-workspace.yaml` — definição dos workspaces
- `turbo.json` — pipeline de build do Turborepo
- `apps/web/astro.config.mjs` — config Astro com adapter Cloudflare
- `apps/web/src/pages/index.astro` — página principal
- `apps/web/src/pages/presentes.astro` — lista de presentes
- `apps/web/src/pages/checkout/[id].astro` — checkout Stripe
- `apps/web/src/pages/api/stripe-webhook.ts` — webhook handler
- `apps/web/src/pages/api/create-checkout-session.ts` — criação de sessão Stripe
- `apps/web/src/pages/api/confirm/[code].astro` — confirmação de presença
- `apps/dashboard/src/routes/__root.tsx` — layout raiz do dashboard
- `apps/dashboard/src/routes/dashboard/gifts.tsx` — CRUD presentes
- `apps/dashboard/src/routes/dashboard/payments.tsx` — visualização pagamentos
- `apps/dashboard/src/routes/dashboard/guests.tsx` — CRUD convidados (Fase 2)
- `apps/feed/src/routes/__root.tsx` — layout raiz do feed
- `apps/feed/src/routes/login.tsx` — tela de login (celular)
- `apps/feed/src/routes/feed/$guestId.tsx` — feed principal
- `supabase/migrations/001_gifts_payments.sql` — schema inicial
- `supabase/migrations/002_guests.sql` — schema convidados
- `supabase/migrations/003_feed_posts.sql` — schema feed
- `supabase/functions/send-whatsapp/index.ts` — Edge Function WhatsApp
- `supabase/functions/send-feed-access/index.ts` — Edge Function acesso feed
- `supabase/functions/r2-signed-url/index.ts` — Edge Function signed URL para R2
- `packages/supabase/src/client.ts` — Supabase client compartilhado
- `packages/supabase/src/types.ts` — tipos gerados

---

## Verificação

### Fase 1
1. Website abre em `raissaefelipe2026.com.br` com todas as seções visíveis e responsivas
2. Countdown atualiza em tempo real
3. Lista de presentes carrega itens do Supabase
4. Clicar "Comprar" redireciona para Stripe Checkout com PIX e cartão disponíveis
5. Após pagamento, webhook popula tabela `payments` e item fica indisponível
6. Dashboard: login funciona, CRUD de presentes operacional, tabela de pagamentos exibe dados

### Fase 2
7. CRUD de convidados funcional com acompanhantes
8. Busca e filtro por status funcionam
9. Exportar CSV gera arquivo correto
10. Envio de WhatsApp dispara mensagem com link de confirmação
11. Link de confirmação atualiza status do convidado no banco

### Fase 3
12. Login por celular dispara link via WhatsApp
13. Acesso via link direto funciona sem etapa de login
14. Convidado sem presença confirmada recebe mensagem de erro
15. Upload de imagem/vídeo funciona e aparece no feed
16. Posts da cápsula do tempo são marcados e não visíveis no feed normal
17. Feed ordena posts do mais recente para o mais antigo

---

## Decisões Tomadas

- **Domínio**: raissaefelipe2026.com.br
- **Monorepo**: pnpm workspaces + Turborepo
- **WhatsApp**: Meta Cloud API (oficial)
- **Stripe**: conta já existente
- **Supabase**: será criado do zero
- **Uploads**: Cloudflare R2 (custo mínimo, zero egress)
- **Feed (cápsula)**: React SPA separado no subdomínio `feed`, mesmo stack do dashboard
- **Auth do feed**: Sem senha — acesso via link com UUID enviado por WhatsApp + validação de presença confirmada

---

## Paleta de Cores

- Primária: `#404a32`
- Secundária: `#5e7c59`
- Referências de estilo: Google Stitches (MCP configurado) + Canva design

---

## Considerações

1. **Stripe parcelamento**: Stripe no Brasil suporta parcelamento nativo apenas com Stripe Checkout (não Elements). A implementação via Checkout Session é a mais simples.
2. **Meta Cloud API setup**: Requer aprovação do Meta Business Manager e criação de templates de mensagem (pode levar 1-2 dias para aprovação). Iniciar esse processo no início da Fase 2.
3. **Compressão de vídeo**: Para a cápsula do tempo, considerar limite de 30s para vídeos e compressão client-side (ex: usando FFmpeg.wasm ou limitando resolução via MediaRecorder API).
