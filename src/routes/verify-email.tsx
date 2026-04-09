import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { VerifyEmail } from '@/surfaces/app/pages/VerifyEmail';

export const Route = createFileRoute('/verify-email')({
  head: () =>
    buildPageHead({
      title: 'Verify Your Email | OmniLux Cloud',
      description: 'Verify your OmniLux Cloud email address to finish account setup.',
      pathname: '/verify-email',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface="app">
      <VerifyEmail />
    </SurfaceGate>
  ),
});
