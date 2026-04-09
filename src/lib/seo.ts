import { APP_SITE_ORIGIN, MARKETING_SITE_ORIGIN, OPS_SITE_ORIGIN, getCurrentSiteSurface } from '@/lib/site-surface';

const MARKETING_ORIGIN = MARKETING_SITE_ORIGIN;
const APP_ORIGIN = APP_SITE_ORIGIN;
const OPS_ORIGIN = OPS_SITE_ORIGIN;
const DEFAULT_OG_IMAGE = `${APP_ORIGIN}/og-image.png`;

type Surface = 'marketing' | 'app' | 'ops';

interface PageHeadOptions {
  title: string;
  description: string;
  pathname: string;
  surface?: Surface;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const buildAbsoluteUrl = (pathname: string, surface: Surface = 'marketing') => {
  const resolvedSurface =
    surface === 'app' && typeof window !== 'undefined' && getCurrentSiteSurface(window.location.hostname) === 'ops'
      ? 'ops'
      : surface;
  const base =
    resolvedSurface === 'app' ? APP_ORIGIN : resolvedSurface === 'ops' ? OPS_ORIGIN : MARKETING_ORIGIN;
  return new URL(pathname, base).toString();
};

export const buildPageHead = ({
  title,
  description,
  pathname,
  surface = 'marketing',
  noIndex = false,
  jsonLd,
}: PageHeadOptions) => {
  const absoluteUrl = buildAbsoluteUrl(pathname, surface);

  return {
    title,
    meta: [
      { name: 'description', content: description },
      { name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: absoluteUrl },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: absoluteUrl }],
    scripts: jsonLd
      ? [
          {
            type: 'application/ld+json',
            children: JSON.stringify(jsonLd),
          },
        ]
      : [],
  };
};

export const buildRootHead = () => ({
  meta: [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'theme-color', content: '#050608' },
    { name: 'author', content: 'OmniLux' },
    {
      name: 'keywords',
      content:
        'media server, self-hosted, streaming, movies, tv, music, games, live tv, plex alternative, jellyfin alternative',
    },
    { property: 'og:site_name', content: 'OmniLux' },
    { property: 'og:image', content: DEFAULT_OG_IMAGE },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'OmniLux — All Your Media. One Platform.' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: DEFAULT_OG_IMAGE },
  ],
  links: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  ],
  scripts: [
  ],
});
