import { Copy, Link2, Plus, Trash2 } from 'lucide-react';
import type { ServerDetailViewModel } from './useServerDetail';

type ServerInvitesCardProps = {
  vm: ServerDetailViewModel;
};

export const ServerInvitesCard = ({ vm }: ServerInvitesCardProps) => (
  <div className="rounded-xl surface-soft p-6">
    <div className="mb-4 flex items-center gap-2">
      <Link2 className="h-5 w-5 text-accent" />
      <h2 className="text-lg font-bold text-foreground">Invites</h2>
    </div>

    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs text-muted">Role</label>
        <select
          value={vm.inviteRole}
          onChange={(event) => vm.setInviteRole(event.target.value as 'user' | 'guest')}
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
          value={vm.inviteMaxUses}
          onChange={(event) => vm.setInviteMaxUses(Number(event.target.value))}
          className="w-20 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
        />
      </div>
      <button
        type="button"
        onClick={() => vm.actions.createInvite.mutate()}
        disabled={vm.actions.createInvite.isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Create invite
      </button>
    </div>

    {vm.invites && vm.invites.length > 0 ? (
      <div className="space-y-2">
        {vm.invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between rounded-lg bg-surface/50 px-4 py-2">
            <div className="text-sm">
              <span className="font-mono text-foreground">{invite.code}</span>
              <span className="ml-2 text-muted">
                {invite.uses}/{invite.max_uses} uses &middot; {invite.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void vm.actions.copyInviteLink(invite.code)}
                className="text-muted hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
                {vm.copiedInvite === invite.code ? <span className="ml-1 text-xs text-success">Copied!</span> : null}
              </button>
              <button
                type="button"
                onClick={() => vm.actions.revokeInvite.mutate(invite.id)}
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
);
