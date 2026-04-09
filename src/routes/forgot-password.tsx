import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { ForgotPassword } from '@/surfaces/app/pages/ForgotPassword';

export const Route = createFileRoute('/forgot-password')({
  head: () =>
    buildPageHead({
      title: 'Reset Password | OmniLux Cloud',
      description: 'Request a password reset email for your OmniLux Cloud account.',
      pathname: '/forgot-password',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface={['app', 'ops']}>
      <ForgotPassword />
    </SurfaceGate>
  ),
});
