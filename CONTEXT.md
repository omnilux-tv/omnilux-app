# OmniLux Customer Cloud App

This context defines the language for the hosted customer app at `app.omnilux.tv`: account UX, linked servers, billing, managed-media visibility, and authenticated customer workflows.

`omnilux-app/` succeeds when a customer can use `app.omnilux.tv` as their authenticated OmniLux account home: manage cloud identity and billing, claim and monitor self-hosted servers, launch relay-mediated access, discover entitled managed media, submit plugins, and perform provider-scoped work only when invited, while all policy and durable state remain owned by `omnilux-cloud/`.

In short, `omnilux-app/` is the authenticated customer account home and orchestration UI. It turns cloud-owned account, billing, server registry, relay, managed-media, provider membership, and plugin-governance contracts into usable customer workflows, but never becomes the durable policy source of truth or the runtime for any media, relay, provider, or operator behavior.

## Language

**Customer Cloud App**:
The hosted signed-in customer surface for accounts, billing, linked servers, and managed OmniLux services.
_Avoid_: Marketing site, operator console, provider portal

**Account Home**:
The signed-in customer surface that gathers billing, linked servers, relay access, managed-media discovery, plugin-governance status, and invited provider work into one hosted UI.
_Avoid_: Dashboard, runtime UI, ops console

**Customer Experience State**:
UI-local state owned by the customer app, such as navigation, form input, loading and error states, fallback cards, and launch orchestration.
_Avoid_: Cloud policy state, account state, entitlement state

**Safe Fixture Fallback**:
UI-only placeholder or fallback content for empty or temporarily unavailable cloud data that cannot unlock actions, bypass entitlement, or become authoritative policy.
_Avoid_: Demo entitlement, fallback grant, policy override

**Cloud Account**:
The customer identity and profile used by hosted OmniLux services.
_Avoid_: Local account, server user

**Hosted Account Auth**:
WorkOS-backed browser authentication for the customer app, with Supabase used for Edge Functions and Postgres-backed control-plane data.
_Avoid_: Local auth, operator auth

**Billing Management UI**:
The customer-facing subscription, plan, payment, and billing-portal entry surfaces in the account home.
_Avoid_: Billing truth, Stripe webhook, entitlement derivation, pricing policy

**Linked Server**:
A self-hosted or managed-media runtime represented in the customer app through cloud-owned registry data.
_Avoid_: Origin URL, direct server, ops service

**Server Card**:
The app's UI representation of a cloud registry row for a self-hosted or managed-media linked server.
_Avoid_: Ops console tile, provider portal tile, origin URL

**Claim Flow**:
The customer-facing process that connects a self-hosted runtime to a cloud account.
_Avoid_: Login, invite, deployment

**Remote Access Launch**:
The app-owned workflow that shows relay readiness, requests a cloud relay session or grant, and navigates the customer to relay.
_Avoid_: Relay policy, grant signing, tunnel transport

**Managed Media Discovery**:
The signed-in customer view of managed-media items the account is allowed to inspect or launch.
_Avoid_: Public catalog, provider catalog management

**Managed Playback Launch**:
The app-owned workflow that requests a playback grant for an explicit managed-media target, asks the managed runtime for grant-bound launch instructions, and reports launch usage through the approved helper.
_Avoid_: Rights policy, grant verification, DRM license proxying, runtime asset ledger

**Managed Service Origin**:
The API-only runtime origin used behind in-app discovery and playback. It is not a customer website, login destination, or catalog surface.
_Avoid_: Managed media website, external customer handoff

**Provider Workspace**:
A provider-scoped area visible only to invited provider members for managed-media partner workflows.
_Avoid_: Customer dashboard authority, operator workspace

**Invited Provider Access**:
Customer-account-adjacent provider visibility and limited scoped actions for invited provider members inside the customer app.
_Avoid_: Provider-first workspace, operator workflow

**Plugin Submission Status UI**:
The authenticated fail-closed status surface explaining that public plugin intake remains unavailable until copyright, takedown, repeat-infringer, licensing, and package-review controls are operating.
_Avoid_: Runtime plugin loader, SDK contract, marketplace policy

**Customer App Exclusion Boundary**:
The responsibilities intentionally owned outside the customer app repo.
_Avoid_: UI integration point ownership, convenient colocated policy

**Playback Grant**:
A cloud-issued authorization used to launch managed-media playback through the managed runtime.
_Avoid_: Session token, entitlement lease

## Relationships

- A **Cloud Account** can own or access many **Linked Servers**.
- **Hosted Account Auth** authenticates a **Cloud Account** in the **Customer Cloud App**.
- **Billing Management UI** displays and initiates billing actions based on cloud/control-plane billing contracts.
- The **Account Home** is the main hosted UI for a **Cloud Account**.
- **Customer Experience State** belongs in this app; durable account, billing, entitlement, claim, relay, registry, provider, and managed-media policy state belongs to `omnilux-cloud/`.
- A **Safe Fixture Fallback** can render placeholder content but launch actions require explicit cloud-backed targets.
- A **Server Card** represents a **Linked Server** in the **Account Home**.
- A **Claim Flow** creates a cloud relationship to a self-hosted **Linked Server**.
- **Remote Access Launch** starts from a relay-capable **Linked Server** but depends on cloud-owned policy and relay-owned transport.
- **Managed Media Discovery** is visible through the **Customer Cloud App** only when cloud policy allows it.
- **Managed Playback Launch** starts from **Managed Media Discovery** with an explicit playback target.
- The **Managed Service Origin** is called by the **Customer Cloud App** but is never opened as a separate customer surface.
- A **Provider Workspace** can expose provider workflows inside the **Customer Cloud App** without granting operator authority.
- **Invited Provider Access** can exist in the **Account Home**, but provider-first workflows belong in `omnilux-provider/`.
- **Plugin Submission Status UI** exposes the closed intake state without accepting packages or owning plugin runtime loading, SDK contracts, plugin package behavior, or final marketplace policy.
- The **Customer App Exclusion Boundary** keeps marketing pages, public docs, durable cloud policy and state, Supabase schema and functions, edge routing, relay transport, self-hosted runtime behavior, managed-media runtime enforcement, operator workflows, provider-first workflows, native clients, and plugin implementation outside this repo.
- A **Playback Grant** is requested by the app and enforced by managed-media services.

## Example dialogue

> **Dev:** "Can a provider publish a release from the customer dashboard?"
> **Domain expert:** "No. The **Provider Workspace** can submit drafts and requests, but publishing remains operator/cloud controlled."

## Flagged ambiguities

- "Server" can mean self-hosted, managed-media, or an operator service. Resolved: customer-facing listings use **Linked Server** and **Server Card** for self-hosted and managed-media runtimes only; ops and provider access are not server cards.
- "Auth" can mean hosted customer, local runtime, or operator authentication. Resolved: this repo uses **Hosted Account Auth** for customer app browser auth.
- Billing UI can be mistaken for billing authority. Resolved: this repo owns **Billing Management UI**, not Stripe webhook handling, entitlement derivation, or pricing policy.
- "Dashboard" can mean runtime, provider, customer, or ops UI. Resolved: this repo uses **Account Home** for the signed-in customer surface.
- UI state can be mistaken for product authority. Resolved: this repo owns **Customer Experience State**, while durable policy and registry state remain cloud-owned.
- Fallback data could accidentally become product authority. Resolved: **Safe Fixture Fallback** cannot unlock actions, bypass entitlement, or provide launch targets.
- Relay UI can be mistaken for relay ownership. Resolved: this repo owns **Remote Access Launch**, not relay entitlement policy, grant signing, tunnel health truth, or frame transport.
- Managed-media launch UI can be mistaken for managed-runtime ownership. Resolved: this repo owns **Managed Playback Launch**, not rights policy, grant verification, DRM license proxying, runtime assets, or usage ledger authority.
- An internet-routable managed origin can be mistaken for a customer website. Resolved: the **Managed Service Origin** is API-only and all customer discovery and controls remain in the **Customer Cloud App**.
- "Managed media access" can mean consumption or provider management. Resolved: **Managed Media Discovery** is consumption; **Provider Workspace** is scoped provider work.
- Provider features in the customer app could become the provider portal by accident. Resolved: this repo owns **Invited Provider Access** only; primary provider workflows belong to `omnilux-provider/`.
- Plugin governance can be mistaken for plugin runtime ownership. Resolved: this repo owns only the fail-closed **Plugin Submission Status UI**.
- Hosted UI integration points could be mistaken for ownership of the underlying system. Resolved: the **Customer App Exclusion Boundary** defines what this repo must not own.
