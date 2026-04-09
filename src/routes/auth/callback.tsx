import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { AuthCallback } from '@/surfaces/app/pages/AuthCallback';

export const Route = createFileRoute('/auth/callback')({
  head: () =>
    buildPageHead({
      title: 'Completing Sign In | OmniLux Cloud',
      description: 'Completing your OmniLux Cloud authentication flow.',
      pathname: '/auth/callback',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface="app">
      <AuthCallback />
    </SurfaceGate>
  ),
});
