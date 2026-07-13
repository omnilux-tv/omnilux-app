import { ManagedAccessModelCard } from "./server-detail/ManagedAccessModelCard";
import { ServerInvitesCard } from "./server-detail/ServerInvitesCard";
import { ServerOverviewCard } from "./server-detail/ServerOverviewCard";
import { ServerUsersCard } from "./server-detail/ServerUsersCard";
import { useServerDetail } from "./server-detail/useServerDetail";

export const ServerDetail = () => {
  const serverDetail = useServerDetail();

  if (!serverDetail.server) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <ServerOverviewCard vm={serverDetail} />
        {serverDetail.isSelfHosted && serverDetail.canManageAccess ? (
          <>
            <ServerUsersCard vm={serverDetail} />
            <ServerInvitesCard vm={serverDetail} />
          </>
        ) : !serverDetail.isSelfHosted ? (
          <ManagedAccessModelCard />
        ) : null}
      </div>
    </div>
  );
};
