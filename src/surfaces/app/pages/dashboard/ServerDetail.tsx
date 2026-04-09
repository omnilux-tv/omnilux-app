import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  getServerDeploymentProfileLabel,
  isSelfHostedDeploymentProfile,
  normalizeServerDeploymentProfile,
} from '@/surfaces/app/lib/server-deployment-profile';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ServerDetailData {
  id: string;
  name: string;
  deployment_profile: string | null;
  public_origin: string | null;
  relay_enabled: boolean;
  relay_status: 'offline' | 'connecting' | 'online' | 'degraded' | 'error';
  relay_last_connected_at: string | null;
  relay_protocol_version: number | null;
  relay_region: string | null;
  relay_capabilities: Record<string, unknown>;
  version: string;
  last_seen_at: string | null;
}

interface ServerAccessRow {
  id: string;
  user_id: string;
  role: string;
  user_email: string | null;
  user_name: string | null;
}

interface InviteRow {
  id: string;
  code: string;
  role: string;
  max_uses: number;
  uses: number;
  expires_at: string | null;
}

export const ServerDetail = () => {
  const { serverId } = useParams({ from: '/dashboard/servers_/$serverId' });
  const queryClient = useQueryClient();
  const [inviteRole, setInviteRole] = useState<'user' | 'guest'>('user');
  const [inviteMaxUses, setInviteMaxUses] = useState(5);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, deployment_profile, public_origin, relay_enabled, relay_status, relay_last_connected_at, relay_protocol_version, relay_region, relay_capabilities, version, last_seen_at')
        .eq('id', serverId)
        .single();
      if (error) throw error;
      return data as ServerDetailData;
    },
  });

  const { data: access } = useQuery({
    queryKey: ['server-access', serverId],
    enabled: isSelfHostedDeploymentProfile(server?.deployment_profile),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_server_access_members', {
        p_server_id: serverId,
      });
      if (error) throw error;
      return data as ServerAccessRow[];
    },
  });

  const { data: invites } = useQuery({
    queryKey: ['server-invites', serverId],
    enabled: isSelfHostedDeploymentProfile(server?.deployment_profile),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('server_invites')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InviteRow[];
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('create-invite', {
        body: {
          serverId,
          role: inviteRole,
          maxUses: inviteMaxUses,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-invites', serverId] }),
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from('server_invites').delete().eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-invites', serverId] }),
  });

  const removeAccess = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase.from('server_access').delete().eq('id', accessId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-access', serverId] }),
  });

  const copyInviteLink = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`);
    setCopiedInvite(code);
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  if (!server) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  const isOnline = server.last_seen_at
    ? Date.now() - new Date(server.last_seen_at).getTime() < 5 * 60 * 1000
    : false;
  const deploymentProfile = normalizeServerDeploymentProfile(server.deployment_profile);
  const deploymentLabel = getServerDeploymentProfileLabel(deploymentProfile);
  const isSelfHosted = deploymentProfile === 'self-hosted';
  const relayTone = {
    offline: 'bg-danger',
    connecting: 'bg-warning',
    online: 'bg-success',
    degraded: 'bg-warning',
    error: 'bg-danger',
  }[server.relay_status];

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-xl surface-soft p-6">
          <div className="flex items-center gap-3">
            <div className={cn('h-3 w-3 rounded-full', isOnline ? 'bg-success' : 'bg-danger')} />
            <h1 className="font-display text-2xl font-bold text-foreground">{server.name}</h1>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted">Profile:</span>{' '}
              <span className="text-foreground">{deploymentLabel}</span>
            </div>
            <div>
              <span className="text-muted">Version:</span>{' '}
              <span className="text-foreground">v{server.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">Relay:</span>
              <span className={cn('inline-block h-2.5 w-2.5 rounded-full', relayTone)} />
              <span className="text-foreground capitalize">{server.relay_status}</span>
              {!server.relay_enabled && <span className="text-xs text-muted">(disabled)</span>}
            </div>
            {server.relay_region && (
              <div>
                <span className="text-muted">Relay region:</span>{' '}
                <span className="text-foreground">{server.relay_region}</span>
              </div>
            )}
            {server.relay_protocol_version !== null && (
              <div>
                <span className="text-muted">Relay protocol:</span>{' '}
                <span className="text-foreground">v{server.relay_protocol_version}</span>
              </div>
            )}
            {server.relay_last_connected_at && (
              <div>
                <span className="text-muted">Relay last connected:</span>{' '}
                <span className="text-foreground">
                  {new Date(server.relay_last_connected_at).toLocaleString()}
                </span>
              </div>
            )}
            {server.public_origin && (
              <div className="sm:col-span-2">
                <span className="text-muted">Public origin:</span>{' '}
                <span className="text-foreground">{server.public_origin}</span>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-lg bg-surface/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Runtime model
            </p>
            {deploymentProfile === 'self-hosted' ? (
              <p className="mt-2 text-sm text-foreground">
                OmniLux Cloud treats relay state as the remote access source of truth. Users can still
                reach their own server directly on their local network or their own reverse proxy, but
                cloud-mediated remote access should use relay when this server is online.
              </p>
            ) : (
              <p className="mt-2 text-sm text-foreground">
                This is a first-party OmniLux runtime profile, not a customer self-hosted server. It is
                tracked in the same cloud registry, but it is expected to be reachable through its
                OmniLux-managed public origin instead of a user-owned LAN or reverse-proxy path.
              </p>
            )}
          </div>
          {server.relay_capabilities && Object.keys(server.relay_capabilities).length > 0 && (
            <div className="mt-4 rounded-lg bg-surface/50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Relay capabilities
              </p>
              <pre className="overflow-x-auto text-xs text-foreground">
                {JSON.stringify(server.relay_capabilities, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {isSelfHosted ? (
          <>
            <div className="rounded-xl surface-soft p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold text-foreground">Users</h2>
              </div>
              {access && access.length > 0 ? (
                <div className="space-y-2">
                  {access.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface/50 px-4 py-2">
                      <div>
                        <span className="text-sm text-foreground">{a.user_name ?? a.user_email ?? 'Unknown user'}</span>
                        {a.user_email && a.user_name && a.user_name !== a.user_email && (
                          <span className="ml-2 text-xs text-muted">{a.user_email}</span>
                        )}
                        <span className="ml-2 text-xs text-muted capitalize">({a.role})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAccess.mutate(a.id)}
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No other users have access.</p>
              )}
            </div>

            <div className="rounded-xl surface-soft p-6">
              <div className="mb-4 flex items-center gap-2">
                <Link2 className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold text-foreground">Invites</h2>
              </div>

              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'user' | 'guest')}
                    className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                  >
                    <option value="user">User</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Max uses</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                    className="w-20 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => createInvite.mutate()}
                  disabled={createInvite.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Create Invite
                </button>
              </div>

              {invites && invites.length > 0 ? (
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg bg-surface/50 px-4 py-2">
                      <div className="text-sm">
                        <span className="font-mono text-foreground">{inv.code}</span>
                        <span className="ml-2 text-muted">
                          {inv.uses}/{inv.max_uses} uses &middot; {inv.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(inv.code)}
                          className="text-muted hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                          {copiedInvite === inv.code && (
                            <span className="ml-1 text-xs text-success">Copied!</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite.mutate(inv.id)}
                          className="text-muted hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No active invites.</p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl surface-soft p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold text-foreground">Access Model</h2>
            </div>
            <p className="text-sm text-muted">
              {deploymentProfile === 'managed-media'
                ? 'Managed media access is granted by OmniLux Cloud product entitlement and shared app identity, not by per-server invites or generic ownership rows.'
                : 'Ops access is operator-managed and should only be visible to accounts flagged for internal operations.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
