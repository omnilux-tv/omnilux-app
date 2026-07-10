/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MARKETING_SITE_URL?: string;
  readonly VITE_APP_SITE_URL?: string;
  readonly VITE_RELAY_SITE_URL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WORKOS_CLIENT_ID?: string;
  readonly VITE_WORKOS_API_HOSTNAME?: string;
  readonly VITE_WORKOS_DEV_MODE?: string;
  readonly VITE_ENABLE_LEGACY_SUPABASE_AUTH?: string;
  readonly VITE_ONE_TIME_CLOUD_CHECKOUT_ENABLED?: string;
  readonly VITE_OAUTH_PROVIDERS?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_UMAMI_SCRIPT_URL?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_WEB_VITALS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
