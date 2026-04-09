import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { Register } from '@/surfaces/app/pages/Register';

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'Create Account | OmniLux Cloud',
      description: 'Create an OmniLux Cloud account for remote services, billing, and connected media features.',
      pathname: '/register',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface="app">
      <Register />
    </SurfaceGate>
  ),
});
