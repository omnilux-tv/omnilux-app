import { useState } from "react";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import type { InviteRow, ServerDetailViewModel } from "./useServerDetail";
import {
  formatInviteDate,
  getInviteExpiryLabel,
  getInviteRoleDescription,
  getInviteStatusLabel,
  getInviteUsageLabel,
  inviteRoleDescriptions,
  isInviteInactive,
} from "./server-invites";

type ServerInvitesCardProps = {
  vm: ServerDetailViewModel;
};

const inviteRoleHelpId = "server-invite-role-help";
const inviteStatusId = "server-invite-status";

const roleLabel = (role: string) => (role === "guest" ? "Guest" : "User");

const InviteRowCard = ({
  copiedInvite,
  confirmRevokeInviteId,
  invite,
  onCancelRevoke,
  onCopy,
  onConfirmRevoke,
  onStartRevoke,
  revokePending,
}: {
  copiedInvite: string | null;
  confirmRevokeInviteId: string | null;
  invite: InviteRow;
  onCancelRevoke: () => void;
  onCopy: (code: string) => void;
  onConfirmRevoke: (inviteId: string) => void;
  onStartRevoke: (inviteId: string) => void;
  revokePending: boolean;
}) => {
  const inactive = isInviteInactive(invite);
  const status = getInviteStatusLabel(invite);
  const awaitingConfirmation = confirmRevokeInviteId === invite.id;
  const copyLabel = `Copy invite link ${invite.code}`;
  const revokeLabel = awaitingConfirmation
    ? `Confirm revoke invite ${invite.code}`
    : `Revoke invite ${invite.code}`;

  return (
    <li
      className={`rounded-lg border px-4 py-3 ${
        inactive
          ? "border-border bg-surface/30 opacity-75"
          : "border-border/70 bg-surface/50"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">
              {invite.code}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                status === "Active"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {status}
            </span>
            <span className="rounded-full bg-muted/30 px-2 py-0.5 text-xs font-semibold text-muted">
              {roleLabel(invite.role)}
            </span>
          </div>

          <dl className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Usage</dt>
              <dd>{getInviteUsageLabel(invite)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Expiry</dt>
              <dd>{getInviteExpiryLabel(invite)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Created</dt>
              <dd>{formatInviteDate(invite.created_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Access</dt>
              <dd>{getInviteRoleDescription(invite.role)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onCopy(invite.code)}
            disabled={inactive}
            aria-label={copyLabel}
            title={copyLabel}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copiedInvite === invite.code ? "Copied" : "Copy"}
          </button>

          {awaitingConfirmation ? (
            <>
              <button
                type="button"
                onClick={() => onConfirmRevoke(invite.id)}
                disabled={revokePending}
                aria-label={revokeLabel}
                title={revokeLabel}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-danger-foreground transition-colors hover:bg-danger/90 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Confirm revoke
              </button>
              <button
                type="button"
                onClick={onCancelRevoke}
                disabled={revokePending}
                className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onStartRevoke(invite.id)}
              disabled={revokePending}
              aria-label={revokeLabel}
              title={revokeLabel}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Revoke
            </button>
          )}
        </div>
      </div>

      {awaitingConfirmation ? (
        <p
          className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          Revoking this invite stops future accepts for code {invite.code}.
          Existing server access is not removed.
        </p>
      ) : null}
    </li>
  );
};

export const ServerInvitesCard = ({ vm }: ServerInvitesCardProps) => {
  const [confirmRevokeInviteId, setConfirmRevokeInviteId] = useState<
    string | null
  >(null);
  const selectedRoleDescription = inviteRoleDescriptions[vm.inviteRole];
  const inviteCount = vm.invites?.length ?? 0;

  const handleConfirmRevoke = (inviteId: string) => {
    vm.actions.revokeInvite.mutate(inviteId, {
      onSettled: () => setConfirmRevokeInviteId(null),
    });
  };

  return (
    <section
      className="rounded-xl surface-soft p-6"
      aria-labelledby="server-invites-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-accent" aria-hidden="true" />
        <h2
          id="server-invites-heading"
          className="text-lg font-bold text-foreground"
        >
          Invites
        </h2>
      </div>

      <p className="mb-4 text-sm text-muted">
        Create limited-use links for people who should join this self-hosted
        server. Share only active links; expired, used-up, or revoked invites
        cannot be accepted.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label
            className="mb-1 block text-xs text-muted"
            htmlFor="server-invite-role"
          >
            Role
          </label>
          <select
            id="server-invite-role"
            value={vm.inviteRole}
            onChange={(event) =>
              vm.setInviteRole(event.target.value as "user" | "guest")
            }
            aria-describedby={inviteRoleHelpId}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            <option value="user">User</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <div>
          <label
            className="mb-1 block text-xs text-muted"
            htmlFor="server-invite-max-uses"
          >
            Max uses
          </label>
          <input
            id="server-invite-max-uses"
            type="number"
            min={1}
            max={100}
            value={vm.inviteMaxUses}
            onChange={(event) =>
              vm.setInviteMaxUses(Number(event.target.value))
            }
            className="w-24 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => vm.actions.createInvite.mutate()}
          disabled={vm.actions.createInvite.isPending}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {vm.actions.createInvite.isPending ? "Creating…" : "Create invite"}
        </button>
      </div>

      <p
        id={inviteRoleHelpId}
        className="mb-4 rounded-lg bg-muted/20 px-3 py-2 text-sm text-muted"
      >
        {selectedRoleDescription}
      </p>

      <p
        id={inviteStatusId}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {vm.copiedInvite
          ? `Copied invite ${vm.copiedInvite} link.`
          : `${inviteCount} active invite ${inviteCount === 1 ? "row" : "rows"} loaded.`}
      </p>

      {vm.invites && vm.invites.length > 0 ? (
        <ul className="space-y-3" aria-describedby={inviteStatusId}>
          {vm.invites.map((invite) => (
            <InviteRowCard
              key={invite.id}
              copiedInvite={vm.copiedInvite}
              confirmRevokeInviteId={confirmRevokeInviteId}
              invite={invite}
              revokePending={vm.actions.revokeInvite.isPending}
              onCancelRevoke={() => setConfirmRevokeInviteId(null)}
              onConfirmRevoke={handleConfirmRevoke}
              onCopy={(code) => void vm.actions.copyInviteLink(code)}
              onStartRevoke={setConfirmRevokeInviteId}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted">
          <p className="font-medium text-foreground">No active invites yet.</p>
          <p className="mt-1">
            Choose a role and max-use limit, create an invite, then copy the
            generated link for a beta tester or household member.
          </p>
        </div>
      )}
    </section>
  );
};
