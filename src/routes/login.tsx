import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { Login } from '@/surfaces/app/pages/Login';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'Sign In | OmniLux Cloud',
      description: 'Sign in to your OmniLux Cloud account to manage servers, billing, and connected services.',
      pathname: '/login',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface="app">
      <Login />
    </SurfaceGate>
  ),
});
