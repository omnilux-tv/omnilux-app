# omnilux-app

Hosted frontend surfaces for `app.omnilux.tv` and `ops.omnilux.tv`.

This repo owns the hosted OmniLux web consoles:

- cloud auth and account flows
- billing and subscription management
- self-hosted server claim and invite management
- managed runtime visibility for `managed-media`
- operator access management and access audit history
- the dedicated operator console at `ops.omnilux.tv`
- plugin submission and other authenticated cloud surfaces

Approved boundary:

- `omnilux-app` owns `app.omnilux.tv`
- `omnilux-app` also owns `ops.omnilux.tv` as a separate operator-only hosted surface
- `ops.omnilux.tv` stays in this repo for now; only split it into a dedicated `omnilux-ops` repo if the operator console starts diverging materially from the hosted customer app
- `omnilux.tv` owns the public marketing site only
- `omnilux-cloud` owns auth, billing, entitlements, invites, and relay control-plane state
- `omnilux-edge` owns ingress and routes `app.omnilux.tv` to this artifact

## Structure

- `src/surfaces/app/` — app-specific page and component ownership
- `src/routes/` — app route files only
- `public/` — static app assets

## Development

```bash
pnpm install
cp .env.example .env
cd ../omnilux-cloud
supabase start
./scripts/replay-local-migrations.sh
cd ../omnilux-app
pnpm dev
```

Fill `VITE_SUPABASE_ANON_KEY` in `.env` from `supabase status` run inside `../omnilux-cloud`.

Required browser config:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional browser config:

- `VITE_MARKETING_SITE_URL`
- `VITE_APP_SITE_URL`
- `VITE_OPS_SITE_URL`
- `VITE_SENTRY_DSN`
- `VITE_WEB_VITALS_ENDPOINT`

## Checks

```bash
pnpm lint
pnpm build
pnpm test:smoke:ops
```

`pnpm test:smoke:ops` targets the live `ops.omnilux.tv` surface and expects these env vars:

- `OPS_SMOKE_OPERATOR_EMAIL`
- `OPS_SMOKE_OPERATOR_PASSWORD`
- `OPS_SMOKE_CUSTOMER_EMAIL`
- `OPS_SMOKE_CUSTOMER_PASSWORD`

## Artifact

The canonical edge-consumed app artifact is the published OCI image `ghcr.io/omnilux-tv/omnilux-app`.

- local build: `pnpm build`
- canonical artifact build: `pnpm build:artifact`
- canonical container build input: `Dockerfile`

## Product rules

- self-hosted servers remain directly reachable by their owners without traversing OmniLux edge
- cloud-mediated remote access should rely on relay state
- `managed-media` visibility is entitlement driven
- `ops.omnilux.tv` is an operator-only hosted console, not a registered OmniLux runtime
- server listings in this app should only model `self-hosted` and `managed-media`; operator access belongs to hosted console access controls, not the server registry
