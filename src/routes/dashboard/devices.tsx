import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Devices } from '@/surfaces/app/pages/dashboard/Devices';

export const Route = createFileRoute('/dashboard/devices')({
  head: () =>
    buildPageHead({
      title: 'Devices | OmniLux Cloud',
      description: 'Review connected OmniLux devices and remote access state.',
      pathname: '/dashboard/devices',
      surface: 'app',
      noIndex: true,
    }),
  component: Devices,
});
