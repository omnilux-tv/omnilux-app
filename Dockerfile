FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

ARG VITE_MARKETING_SITE_URL=https://omnilux.tv
ARG VITE_APP_SITE_URL=https://app.omnilux.tv
ARG VITE_OPS_SITE_URL=https://ops.omnilux.tv
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SENTRY_DSN=
ARG VITE_WEB_VITALS_ENDPOINT=

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN cat <<EOF > .env.production
VITE_MARKETING_SITE_URL=${VITE_MARKETING_SITE_URL}
VITE_APP_SITE_URL=${VITE_APP_SITE_URL}
VITE_OPS_SITE_URL=${VITE_OPS_SITE_URL}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
VITE_WEB_VITALS_ENDPOINT=${VITE_WEB_VITALS_ENDPOINT}
EOF

RUN pnpm build:artifact

FROM caddy:2.10-alpine AS runtime

WORKDIR /srv

COPY --from=builder /app/dist ./

RUN cat <<'EOF' > /etc/caddy/Caddyfile
{
  admin off
  auto_https off
}

:8080 {
  root * /srv
  encode zstd gzip
  try_files {path} {path}/ /index.html
  file_server

  @immutableAssets path /assets/*
  header @immutableAssets Cache-Control "public, max-age=31536000, immutable"

  header {
    -Server
    Referrer-Policy strict-origin-when-cross-origin
    X-Content-Type-Options nosniff
  }
}
EOF

EXPOSE 8080
