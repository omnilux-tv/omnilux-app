FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY --from=omnilux-packages package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /omnilux-packages/
COPY --from=omnilux-packages packages/types /omnilux-packages/packages/types
RUN cd /omnilux-packages && pnpm install --frozen-lockfile && pnpm --filter @omnilux/types build

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

ARG VITE_MARKETING_SITE_URL=https://omnilux.tv
ARG VITE_APP_SITE_URL=https://app.omnilux.tv
ARG VITE_OPS_SITE_URL=https://ops.omnilux.tv
ARG VITE_RELAY_SITE_URL=https://relay.omnilux.tv
ARG VITE_SUPABASE_URL=https://api.omnilux.tv
ARG VITE_SUPABASE_BROWSER_VALUE
ARG VITE_WORKOS_CLIENT_ID=
ARG VITE_WORKOS_API_HOSTNAME=
ARG VITE_WORKOS_DEV_MODE=false
ARG VITE_OAUTH_PROVIDERS=
ARG VITE_TURNSTILE_SITE_KEY=
ARG VITE_SENTRY_DSN=
ARG VITE_WEB_VITALS_ENDPOINT=

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN cat <<EOF > .env.production
VITE_MARKETING_SITE_URL=${VITE_MARKETING_SITE_URL}
VITE_APP_SITE_URL=${VITE_APP_SITE_URL}
VITE_OPS_SITE_URL=${VITE_OPS_SITE_URL}
VITE_RELAY_SITE_URL=${VITE_RELAY_SITE_URL}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_BROWSER_VALUE}
VITE_WORKOS_CLIENT_ID=${VITE_WORKOS_CLIENT_ID}
VITE_WORKOS_API_HOSTNAME=${VITE_WORKOS_API_HOSTNAME}
VITE_WORKOS_DEV_MODE=${VITE_WORKOS_DEV_MODE}
VITE_OAUTH_PROVIDERS=${VITE_OAUTH_PROVIDERS}
VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}
VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
VITE_WEB_VITALS_ENDPOINT=${VITE_WEB_VITALS_ENDPOINT}
EOF

RUN pnpm build:artifact

FROM caddy:2.10-alpine AS runtime

ARG OMNILUX_BUILD_REPOSITORY=unknown
ARG OMNILUX_BUILD_REF=unknown
ARG OMNILUX_BUILD_SHA=unknown
ARG OMNILUX_BUILD_CREATED=unknown

WORKDIR /srv

COPY --from=builder /app/dist ./

RUN mkdir -p /srv/.well-known && \
    printf '{\n  "repository": "%s",\n  "ref": "%s",\n  "sha": "%s",\n  "created": "%s"\n}\n' \
      "${OMNILUX_BUILD_REPOSITORY}" \
      "${OMNILUX_BUILD_REF}" \
      "${OMNILUX_BUILD_SHA}" \
      "${OMNILUX_BUILD_CREATED}" \
      > /srv/.well-known/omnilux-build.json

RUN cat <<'EOF' > /etc/caddy/Caddyfile
{
  admin off
  auto_https off
}

:8080 {
  root * /srv
  encode zstd gzip

  @immutableAssets path /assets/*
  header @immutableAssets Cache-Control "public, max-age=31536000, immutable"

  handle @immutableAssets {
    file_server
  }

  handle {
    try_files {path} {path}/ /index.html
    file_server
  }

  header {
    -Server
    Referrer-Policy strict-origin-when-cross-origin
    X-Content-Type-Options nosniff
  }
}
EOF

EXPOSE 8080
