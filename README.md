# omnilux-app

Hosted customer frontend for `app.omnilux.tv`.

## Workspace

This repository is part of the official OmniLux multi-repo workspace. Use the root `omnilux-workspace` repo for onboarding, profiles, and cross-repo contracts:

- Onboarding: `../ONBOARDING.md`
- Manifest: `../workspace.repositories.json`
- Contracts: `../contracts/`
- Context: `./CONTEXT.md`

This repo owns the hosted OmniLux customer cloud app:

- cloud auth and account flows
- billing and subscription management
- self-hosted server claim and invite management
- managed runtime visibility for `media.omnilux.tv`
- signed-in managed-media discovery and provider workspaces, including delegated provider unit visibility and read-only contract operational term counts for invited provider members
- plugin submission and other authenticated cloud surfaces

Approved boundary:

- `omnilux-app` owns `app.omnilux.tv`
- `omnilux-ops` owns `ops.omnilux.tv`
- `omnilux.tv` owns the public marketing site only
- `omnilux-cloud` owns auth, billing, entitlements, invites, and relay control-plane state
- `omnilux-edge` owns ingress and routes `app.omnilux.tv` to this artifact

## Canonical Contracts

- Cloud console IA: `../omnilux/docs/planning/cloud-console-ia.md`
- Cloud app contract: `../contracts/cloud-app-contract-plan.md`
- Cloud service plans: `../omnilux/docs/planning/cloud-services-plans/`
- Managed media contract: `../contracts/managed-media-plan.md`
- Relay contract: `../contracts/relay-contract-plan.md`

Keep customer app docs focused on hosted UI behavior. Cloud API shape, entitlement rules, relay state, and server summaries should be changed in the relevant canonical contract when they affect other repos.

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
- `VITE_WORKOS_CLIENT_ID`

Required production browser config:

- `VITE_WORKOS_API_HOSTNAME` — WorkOS custom authentication API hostname for production browser-cookie sessions

Optional browser config:

- `VITE_WORKOS_DEV_MODE` — set to `true` only for local or sandbox AuthKit usage without a custom authentication API hostname
- `VITE_MARKETING_SITE_URL`
- `VITE_APP_SITE_URL`
- `VITE_OPS_SITE_URL`
- `VITE_DOCS_SITE_URL`
- `VITE_RELAY_SITE_URL`
- `VITE_OAUTH_PROVIDERS` — legacy Supabase Auth fallback only
- `VITE_SENTRY_DSN`
- `VITE_WEB_VITALS_ENDPOINT`

WorkOS AuthKit must allow the app origin and the callback URL `${VITE_APP_SITE_URL}/auth/callback`. Production should use a WorkOS custom authentication API hostname through `VITE_WORKOS_API_HOSTNAME`; `VITE_WORKOS_DEV_MODE=true` is only for local or sandbox usage. Supabase remains required for Edge Functions and Postgres-backed control-plane data, but browser function calls send the WorkOS access token when `VITE_WORKOS_CLIENT_ID` is configured.

## Checks

```bash
pnpm lint
pnpm build
```

## Artifact

The canonical edge-consumed app artifact is the published OCI image `ghcr.io/omnilux-tv/omnilux-app`.

- local build: `pnpm build`
- canonical artifact build: `pnpm build:artifact`
- canonical container build input: `Dockerfile`
- local container build: `docker build --build-context omnilux-packages=../omnilux-packages -t omnilux-app:local .`

## Product rules

- self-hosted servers remain directly reachable by their owners without traversing OmniLux edge
- cloud-mediated remote access should rely on relay state
- `managed-media` visibility is entitlement driven and should be shown only to accounts allowed by cloud policy
- `get-customer-overview` is the hosted-app contract for customer onboarding state, managed media runtime status, and relay policy
- managed-media playback launch should use `src/surfaces/app/lib/managed-media-launch.ts` so the app requests a cloud-issued playback grant and then asks `media.omnilux.tv` for grant-bound launch instructions
- cloud-backed discovery launch cards should request playback grants with the
  release-backed target shape (`releaseVersionId` plus `assetId`) so
  `omnilux-cloud` resolves catalog, rights, and asset policy from cloud state;
  full client-submitted policy fields are only for fixture fallback cards
- grant-backed managed-media launches should mark the cloud grant consumed after `media.omnilux.tv` accepts the launch and record best-effort runtime usage events through `src/surfaces/app/lib/managed-media-launch.ts`; usage reporting must not bypass `media.omnilux.tv`
- signed-in managed-media discovery should use `list-managed-media-discovery`
  from `omnilux-cloud` first; fixture cards are only a safe fallback for empty
  early environments or temporary cloud catalog failures
- discovery cards in `src/surfaces/app/pages/dashboard/ManagedMedia.tsx` may render a launch action only when the shared discovery item includes an explicit playback target; preview-only and locked items must remain non-launchable
- managed media is for OmniLux-operated partner/studio media and should not be treated as a public catalog for every signed-in account by default
- broad access for all authenticated accounts is a controlled preview/demo policy, not the intended production posture
- provider or studio management belongs behind provider-scoped/operator-gated access, not ordinary customer dashboard authority
- provider-facing reporting, settlement statement visibility, catalog draft, release draft, rights draft, asset-delivery intake, and request UI in `src/surfaces/app/pages/dashboard/ManagedMedia.tsx` must remain conditional on active provider workspaces from `list-my-managed-media-provider-workspaces`; provider requests can link item/release/rights context, reporting and approved/exported settlement statements are aggregate/read-only, release drafts cannot publish or become current releases, and ingestion processing, publish, approval, takedown, analytics, payout, and settlement authority stay in operator/cloud workflows
- server listings in this app should only model `self-hosted` and `managed-media`; operator access belongs to the separate ops console, not the server registry
