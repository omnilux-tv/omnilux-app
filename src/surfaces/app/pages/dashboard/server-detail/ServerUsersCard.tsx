import { Trash2, Users } from "lucide-react";
import type { ServerDetailViewModel } from "./useServerDetail";

type ServerUsersCardProps = {
  vm: ServerDetailViewModel;
};

export const ServerUsersCard = ({ vm }: ServerUsersCardProps) =>
  vm.canManageAccess ? (
    <div className="rounded-xl surface-soft p-6">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Users</h2>
      </div>
      {vm.access && vm.access.length > 0 ? (
        <div className="space-y-2">
          {vm.access.map((access) => (
            <div
              key={access.id}
              className="flex items-center justify-between rounded-lg bg-surface/50 px-4 py-2"
            >
              <div>
                <span className="text-sm text-foreground">
                  {access.user_name ?? access.user_email ?? "Unknown user"}
                </span>
                {access.user_email &&
                access.user_name &&
                access.user_name !== access.user_email ? (
                  <span className="ml-2 text-xs text-muted">
                    {access.user_email}
                  </span>
                ) : null}
                <span className="ml-2 text-xs text-muted capitalize">
                  ({access.role})
                </span>
              </div>
              <button
                type="button"
                onClick={() => vm.actions.removeAccess.mutate(access.id)}
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
  ) : null;
