import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, Server } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { ServerCard } from '@/surfaces/app/components/ServerCard';
import {
  isManagedMediaDeploymentProfile,
  isSelfHostedDeploymentProfile,
} from '@/surfaces/app/lib/server-deployment-profile';

interface ServerRow {
  id: string;
  name: string;
  version: string | null;
  deployment_profile: string | null;
  public_origin: string | null;
  last_seen_at: string | null;
  relay_enabled: boolean | null;
  relay_status: string | null;
}

export const Servers = () => {
  const { user } = useAuth();

  const { data: servers, error, isLoading } = useQuery({
    queryKey: ['servers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ServerRow[]>('list-servers');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
  const selfHostedServers = (servers ?? []).filter((server) => isSelfHostedDeploymentProfile(server.deployment_profile));
  const managedMediaServers = (servers ?? []).filter((server) => isManagedMediaDeploymentProfile(server.deployment_profile));

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Cloud-Linked Servers</h1>
            <p className="mt-1 text-sm text-muted">
              OmniLux runtimes visible to this account. Self-hosted servers and OmniLux-managed media follow different cloud access rules.
            </p>
          </div>
          <Link
            to="/dashboard/claim"
            search={{ code: undefined }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Claim a Server
          </Link>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl bg-danger/10 p-6 text-sm text-danger">
              {error instanceof Error ? error.message : 'Failed to load claimed servers.'}
            </div>
          ) : servers && servers.length > 0 ? (
            <div className="space-y-8">
              {selfHostedServers.length > 0 ? (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                      Self-hosted
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Customer-owned OmniLux servers attached for relay, invites, and cloud-linked features.
                    </p>
                  </div>
                  {selfHostedServers.map((s) => (
                    <ServerCard
                      key={s.id}
                      id={s.id}
                      name={s.name}
                      version={s.version ?? 'unknown'}
                      deploymentProfile={s.deployment_profile}
                      lastSeenAt={s.last_seen_at}
                      relayEnabled={s.relay_enabled}
                      relayStatus={s.relay_status}
                    />
                  ))}
                </section>
              ) : null}

              {managedMediaServers.length > 0 ? (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                      OmniLux Media
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      First-party managed runtimes available through OmniLux Cloud entitlement, not customer-owned server sharing.
                    </p>
                  </div>
                  {managedMediaServers.map((s) => (
                    <ServerCard
                      key={s.id}
                      id={s.id}
                      name={s.name}
                      version={s.version ?? 'unknown'}
                      deploymentProfile={s.deployment_profile}
                      lastSeenAt={s.last_seen_at}
                      relayEnabled={s.relay_enabled}
                      relayStatus={s.relay_status}
                    />
                  ))}
                </section>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl surface-soft p-12 text-center">
              <Server className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">No servers linked</h2>
              <p className="mt-2 text-sm text-muted">
                Local hosting works without the cloud. Claim a server here when you want relay, companion access, or shared cloud features.
              </p>
              <Link
                to="/dashboard/claim"
                search={{ code: undefined }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                Claim a Server
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
