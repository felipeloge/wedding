# Handover — Casamento Raíssa & Felipe

> **Sessão de origem**: `2b04dffb-3302-40b3-862d-2b03b3e49dfe`
> Para recuperar contexto desta sessão em uma nova conversa, use o comando `/chronicle search wedding` ou cole o bloco "Contexto para nova sessão" abaixo.

---

## Como referenciar esta sessão

O GitHub Copilot Chat não persiste conversas entre sessões automaticamente. Para retomar o contexto de forma confiável em uma nova janela/sessão, use uma das abordagens abaixo:

### Opção 1 — Chronicle (dentro do VS Code)
```
/chronicle search wedding
```
Isso mostra um histórico das sessões recentes com este projeto.

### Opção 2 — Colar o bloco de contexto
No início da nova conversa, cole:

```
Contexto do projeto "Casamento Raíssa & Felipe":
- Monorepo pnpm em /Users/felipe.loge/www/felipeloge/wedding
- Branch: phase1 (fase 1 concluída)
- Ver PLAN.md e HANDOVER.md na raiz para contexto completo
- Retomar na Fase 2 (ver PLAN.md #FASE-2)
```

### Opção 3 — Abrir o PLAN.md como contexto
Abra o arquivo PLAN.md e adicione ao chat com `#PLAN.md`.

---

## Estado atual do projeto (2026-08-22)

### ✅ Fase 1 — Concluída

**Website (`apps/web`)** — Astro 5 + SCSS + Cloudflare adapter
- [x] Página principal com hero, countdown (28/11/2026), carrossel de fotos, localização, hospedagem, CTA presentes
- [x] Fotos reais do pré-wedding em `public/images/`
- [x] Lista de presentes (`/presentes`) — SSR, busca no Supabase
- [x] Checkout (`/checkout/[id]`) — coleta mensagem + redireciona ao Stripe
- [x] Página de sucesso (`/obrigado`)
- [x] API `POST /api/create-checkout-session` — cria Stripe Checkout Session (PIX + cartão + parcelamento)
- [x] API `POST /api/stripe-webhook` — processa pagamentos, atualiza `gifts.is_available`, salva em `payments`
- [x] Header sticky com glassmorphism + menu hamburger mobile
- [x] Footer
- [x] Wrangler configurado (`wrangler.toml`)
- [x] `.env` configurado

**Dashboard (`apps/dashboard`)** — React 19 + TanStack Router + TanStack Query + Tailwind
- [x] Login com Supabase Auth (email/password)
- [x] Auth guard (rotas protegidas com `beforeLoad`)
- [x] Sidebar com navegação
- [x] Página Home — stats (total presentes, total arrecadado, pendentes) + tabela de pagamentos recentes
- [x] Página Presentes — CRUD completo + upload de imagem no Supabase Storage
- [x] Página Pagamentos — tabela com filtros por status + exportar CSV
- [x] `.env` configurado

**Banco de dados (Supabase)**
- [x] Tabelas: `gifts`, `payments`
- [x] RLS ativo (anon lê gifts disponíveis; authenticated faz tudo; service role para webhook)
- [x] Storage bucket `gift-images` configurado
- [x] Migration: `supabase/migrations/20260809000001_gifts_payments.sql`

**Stripe**
- [x] Checkout Session com PIX + cartão + parcelamento (pt-BR)
- [x] Webhook testado localmente com `stripe listen`

---

### ⏳ Fase 2 — A implementar: Confirmação de Presença

**Objetivo**: Gerenciar lista de convidados e enviar convites via WhatsApp com link de confirmação.

**O que fazer:**
1. Criar migration `supabase/migrations/20260822000002_guests.sql` com tabelas:
   - `guests` (id, name, phone, observations, rsvp_status, rsvp_confirmed_at, short_url_code)
   - `guest_companions` (id, guest_id, name, phone)
   - `whatsapp_messages` (id, guest_id, template_name, status, sent_at)
2. Adicionar tipos em `apps/dashboard/src/lib/types.ts`
3. Criar migration no Supabase (npx supabase db push)
4. Dashboard — nova página `/dashboard/guests`:
   - CRUD de convidados com sub-lista de acompanhantes
   - Tabela: Nome, Acompanhantes, Celular, Status, Data confirmação, Ações
   - Busca por nome, filtro por status, exportar CSV
   - Ação "enviar WhatsApp" → Supabase Edge Function `send-whatsapp`
5. Configurar Meta Cloud API:
   - Criar WhatsApp Business Account + registrar número
   - Criar e aprovar template de mensagem
6. Criar Edge Function `supabase/functions/send-whatsapp/index.ts`
7. Criar página no website `apps/web/src/pages/confirmar/[code].astro`:
   - Mostra botão "Confirmar presença"
   - PUT request atualiza `guests.rsvp_status = 'confirmed'`
8. Adicionar rota `/dashboard/guests` no router (`apps/dashboard/src/router.tsx`)

---

### ⏳ Fase 3 — A implementar: Cápsula do Tempo

**Objetivo**: Feed de mídia para convidados, acessível via `feed.raissaefelipe2026.com.br`.

**O que fazer:**
1. Criar `apps/feed/` — novo app React 19 (clonar estrutura do dashboard)
2. Criar migration `supabase/migrations/20261001000003_feed_posts.sql`
3. Configurar Cloudflare R2 bucket para uploads de mídia
4. Criar Edge Function `supabase/functions/r2-signed-url/index.ts`
5. Implementar fluxo de auth: celular → link via WhatsApp → validação `rsvp_status = 'confirmed'`
6. Feed: listagem de posts (imagem/vídeo + caption), ordenados por data
7. Upload privado (cápsula): posts com `visible_after = 28/11/2027`
8. Deploy: novo projeto Cloudflare Pages → `feed.raissaefelipe2026.com.br`

---

## Arquitetura & decisões técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Estilos do website | SCSS (não Tailwind) | Usuário migrou durante desenvolvimento |
| Estilos do dashboard | Tailwind CSS | Shadcn/ui compat |
| Upload de gift images | Supabase Storage | Simples para MVP, R2 é para Fase 3 |
| Upload de cápsula | Cloudflare R2 | Zero egress, custo mínimo para mídia pública |
| WhatsApp | Meta Cloud API | Oficial, templates aprovados |
| Auth dashboard | Supabase Auth (email/password) | Acesso restrito ao casal |
| Auth feed | UUID na URL + validação de presença | Sem senha para convidados |
| Checkout | Stripe Checkout hosted | PIX + parcelamento nativo no Brasil |
| Router dashboard | TanStack Router (code-based) | Evita `routeTree.gen.ts` auto-gerado |

## Domínios e deploys

| App | URL | Cloudflare Pages Project |
|-----|-----|--------------------------|
| Website | raissaefelipe2026.com.br | `wedding-web` |
| Dashboard | dashboard.raissaefelipe2026.com.br | `wedding-dashboard` |
| Feed (Fase 3) | feed.raissaefelipe2026.com.br | `wedding-feed` |

## Estrutura de arquivos relevante

```
wedding/
├── PLAN.md                          ← plano completo das 3 fases
├── HANDOVER.md                      ← este arquivo
├── apps/
│   ├── web/
│   │   ├── astro.config.mjs         ← output: 'static' + Cloudflare adapter
│   │   ├── wrangler.toml            ← Cloudflare Pages config
│   │   ├── src/styles/              ← SCSS (global.scss + _variables, _base, _animations)
│   │   ├── src/components/          ← Header, Footer, HeroCountdown, PreWeddingCarousel,
│   │   │                               GiftGrid, CheckoutForm (com .module.scss)
│   │   └── src/pages/api/           ← create-checkout-session.ts, stripe-webhook.ts
│   └── dashboard/
│       ├── src/router.tsx           ← TanStack Router (code-based, auth guard)
│       ├── src/lib/types.ts         ← tipos do banco (manter em sync com packages/supabase)
│       ├── src/lib/supabase.ts      ← cliente Supabase
│       ├── src/pages/GiftsPage.tsx  ← CRUD presentes
│       ├── src/pages/PaymentsPage.tsx ← visualização pagamentos
│       └── src/components/ui/      ← Button, Input, Label, Textarea, Badge, Card,
│                                      Dialog, Separator
├── packages/
│   ├── config/tsconfig/             ← base.json, react.json
│   └── supabase/src/                ← types.ts, client.ts, index.ts
└── supabase/
    ├── config.toml
    └── migrations/
        └── 20260809000001_gifts_payments.sql
```

## Variáveis de ambiente

### `apps/web/.env`
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### `apps/dashboard/.env`
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Comandos do dia a dia

```bash
# Dev
pnpm dev                                            # todos os apps
pnpm --filter @wedding/web dev                      # só website (porta 4321)
pnpm --filter @wedding/dashboard dev                # só dashboard (porta 5173)

# Stripe local
stripe listen --forward-to localhost:4321/api/stripe-webhook

# Supabase
supabase start                                      # local (requer Docker)
supabase db push                                    # aplicar migrations
supabase gen types typescript --project-id=XXXX     # regenerar types

# Build & Deploy
pnpm build                                          # todos os apps
pnpm --filter @wedding/web build                    # website
wrangler pages deploy dist --project-name=wedding-web  # deploy manual
```

## Google Stitches (referências de design)

- **Project ID**: `14306152082692487642`
- **Design system**: "Ethereal Botanica" — asset ID `95576d170c72412fb9f2513a0ab495f4`
- Screens relevantes para Fase 2/3:
  - `c90f9a7117d647c9b0a96c8d87dd4376` — Gestão de Convidados - Dashboard
  - `132b87b35ada4186a83cc3d09ca13e46` — Dashboard - Criar/Editar Convidado
  - `c87d71e1e35549af927c765f5f4b60a5` — Confirmação de Presença - Convidado
  - `629bd92f056f48f292a7b94b0f596fa6` — Cápsula do Tempo - Feed Mobile
  - `618c70f7a41f44aeadaedd67690bee75` — Cápsula do Tempo - Upload Privado
  - `251ac9196a8b412f9b1b74b302be20cd` — Cápsula do Tempo - Login Celular
  - `f80068447d6141d991d27f2251b0212c` — Cápsula do Tempo - Verificação OTP
  - `37fe0b2f19d7456898571c0886f7e09a` — Cápsula do Tempo - RSVP Necessário
  - `b46cc2dabd7340c2931fe533d7d6f9bb` — Cápsula do Tempo - Erro no Login
