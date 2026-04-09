import { Smartphone } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface DeviceSession {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  last_active_at: string;
  is_current: boolean;
}

export const Devices = () => {
  const { session } = useAuth();
  const sessions: DeviceSession[] = session
    ? [{
        id: session.access_token,
        device_name: 'Current browser session',
        device_type: 'Web',
        ip_address: 'Managed by Supabase Auth',
        last_active_at: session.user.last_sign_in_at ?? new Date().toISOString(),
        is_current: true,
      }]
    : [];

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Account Sessions</h1>
          <p className="mt-1 text-sm text-muted">
            Devices currently authenticated against OmniLux Cloud. This is separate from device management inside each self-hosted server.
          </p>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl surface-soft p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.device_name}
                      {s.is_current && (
                        <span className="ml-2 text-xs text-success">(this device)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {s.device_type} &middot; {s.ip_address} &middot; Last active{' '}
                      {new Date(s.last_active_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl surface-soft p-12 text-center">
            <Smartphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted">Sign in to view your current browser session.</p>
          </div>
        )}
      </div>
    </div>
  );
};
