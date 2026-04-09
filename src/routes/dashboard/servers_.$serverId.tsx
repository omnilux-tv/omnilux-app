import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { ServerDetail } from '@/surfaces/app/pages/dashboard/ServerDetail';

export const Route = createFileRoute('/dashboard/servers_/$serverId')({
  head: ({ params }) =>
    buildPageHead({
      title: `Server ${params.serverId} | OmniLux Cloud`,
      description: 'View OmniLux server members, invites, relay state, and access controls.',
      pathname: `/dashboard/servers/${params.serverId}`,
      surface: 'app',
      noIndex: true,
    }),
  component: ServerDetail,
});
