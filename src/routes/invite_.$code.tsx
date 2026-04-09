import { createFileRoute } from '@tanstack/react-router';
import { SurfaceGate } from '@/components/SurfaceGate';
import { InviteAccept } from '@/surfaces/app/pages/InviteAccept';

export const Route = createFileRoute('/invite_/$code')({
  component: () => (
    <SurfaceGate surface="app">
      <InviteAccept />
    </SurfaceGate>
  ),
});
