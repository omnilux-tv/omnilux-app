/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MARKETING_SITE_URL?: string;
  readonly VITE_APP_SITE_URL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_UMAMI_SCRIPT_URL?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_WEB_VITALS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
