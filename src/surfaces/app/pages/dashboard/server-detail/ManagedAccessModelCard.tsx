import { ShieldCheck } from 'lucide-react';

export const ManagedAccessModelCard = () => (
  <div className="rounded-xl surface-soft p-6">
    <div className="mb-4 flex items-center gap-2">
      <ShieldCheck className="h-5 w-5 text-accent" />
      <h2 className="text-lg font-bold text-foreground">Access model</h2>
    </div>
    <p className="text-sm text-muted">
      Managed media access is granted by OmniLux Cloud product access and shared app identity, not by per-server invites.
    </p>
  </div>
);
