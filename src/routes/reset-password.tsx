import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { ResetPassword } from '@/surfaces/app/pages/ResetPassword';

export const Route = createFileRoute('/reset-password')({
  head: () =>
    buildPageHead({
      title: 'Choose a New Password | OmniLux Cloud',
      description: 'Set a new password for your OmniLux Cloud account.',
      pathname: '/reset-password',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface="app">
      <ResetPassword />
    </SurfaceGate>
  ),
});
