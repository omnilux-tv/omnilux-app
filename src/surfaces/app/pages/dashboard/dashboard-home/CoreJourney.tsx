import { Link } from "@tanstack/react-router";
import { buildDocsHref } from "@/lib/site-surface";
import type { CustomerOverview } from "@/surfaces/app/lib/customer-overview";

type CoreJourneyProps = {
  customerOverview: CustomerOverview | undefined;
  isLoading: boolean;
  error: unknown;
};

export const CoreJourney = ({
  customerOverview,
  isLoading,
  error,
}: CoreJourneyProps) => (
  <section className="mt-12">
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Browser-first beta
      </p>
      <h2 className="mt-2 font-display text-xl font-bold text-foreground">
        Your household beta journey
      </h2>
      <p className="mt-2 text-sm text-muted">
        Prove local value first: run one approved immutable artifact beside your
        current server, mount the library read-only, scan it, and play a title
        in the browser. Cloud claim, remote access, and invites come later.
      </p>
    </div>

    {isLoading ? (
      <div
        className="mt-5 grid gap-4 lg:grid-cols-4"
        aria-label="Loading household beta status"
      >
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl bg-surface"
          />
        ))}
      </div>
    ) : (
      <>
        {error ? (
          <div
            className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground"
            role="status"
          >
            {error instanceof Error
              ? error.message
              : "Household beta status could not be loaded."}
            <p className="mt-1 text-muted">
              The local install and first-play path below remain available
              without cloud status.
            </p>
          </div>
        ) : (
          <JourneyStats customerOverview={customerOverview} />
        )}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <RecommendedActions
            customerOverview={error ? undefined : customerOverview}
          />
          <ClarityPanel />
        </div>
      </>
    )}
  </section>
);

const JourneyStats = ({
  customerOverview,
}: {
  customerOverview: CustomerOverview | undefined;
}) => {
  const selfHostedServersTotal =
    customerOverview?.metrics.selfHostedServersTotal ?? 0;
  const relayOnlineServersTotal =
    customerOverview?.metrics.relayOnlineServersTotal ?? 0;
  const stats = [
    {
      title: "Primary client",
      value: "Browser",
      detail:
        "Desktop browser playback is the supported first-cohort experience.",
    },
    {
      title: "Library safety",
      value: "Read-only",
      detail:
        "The beta install must not write to the media tree your current server uses.",
    },
    {
      title: "Linked servers",
      value: String(selfHostedServersTotal),
      detail:
        selfHostedServersTotal > 0
          ? "Your account is linked after local setup."
          : "Linking is optional until local playback works.",
    },
    {
      title: "Remote path",
      value: relayOnlineServersTotal > 0 ? "Relay online" : "Direct first",
      detail:
        "Use LAN or your private network first; relay is a bounded fallback after linking.",
    },
  ];

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      {stats.map(({ title, value, detail }) => (
        <div
          key={title}
          className="rounded-xl border border-border bg-background p-5"
        >
          <p className="text-xs font-semibold text-muted">{title}</p>
          <p className="mt-3 font-display text-2xl font-bold text-foreground">
            {value}
          </p>
          <p className="mt-3 text-sm text-muted">{detail}</p>
        </div>
      ))}
    </div>
  );
};

const RecommendedActions = ({
  customerOverview,
}: {
  customerOverview: CustomerOverview | undefined;
}) => {
  const selfHostedServersTotal =
    customerOverview?.metrics.selfHostedServersTotal ?? 0;

  return (
    <div className="rounded-xl surface-soft p-6">
      <h3 className="font-semibold text-foreground">Do these in order</h3>
      <ol className="mt-4 space-y-3">
        <li className="rounded-xl bg-surface/60 p-4">
          <ActionCopy
            step="1"
            label="Install safely and reach first local playback"
            body="Wait for an approved digest, keep your incumbent server running, mount media read-only, then scan and play one title in the browser."
          />
          <a
            href={buildDocsHref("/guide/quick-start")}
            className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Open the beta quick start
          </a>
        </li>
        <li className="rounded-xl bg-surface/60 p-4">
          <ActionCopy
            step="2"
            label="Link this account only after playback works"
            body={
              selfHostedServersTotal > 0
                ? "At least one self-hosted server is already linked to this account."
                : "Use the claim code only when you want account continuity, remote access, or household invites."
            }
            complete={selfHostedServersTotal > 0}
          />
          <Link
            to={
              selfHostedServersTotal > 0
                ? "/dashboard/servers"
                : "/dashboard/claim"
            }
            className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            {selfHostedServersTotal > 0
              ? "Review linked servers"
              : "Claim a server"}
          </Link>
        </li>
        <li className="rounded-xl bg-surface/60 p-4">
          <ActionCopy
            step="3"
            label="Test remote access directly first"
            body="Use the LAN URL or a private network you control. Relay remains optional and must pass separate entitlement and safety gates."
          />
          <a
            href={buildDocsHref("/guide/remote-access")}
            className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Review remote paths
          </a>
        </li>
        <li className="rounded-xl bg-surface/60 p-4">
          <ActionCopy
            step="4"
            label="Invite one household member"
            body="After the linked server is stable, open it from the account and create a limited household invite."
          />
          <Link
            to="/dashboard/servers"
            className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Open servers
          </Link>
        </li>
      </ol>
    </div>
  );
};

const ActionCopy = ({
  step,
  label,
  body,
  complete = false,
}: {
  step: string;
  label: string;
  body: string;
  complete?: boolean;
}) => (
  <div className="flex gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold text-accent">
      {complete ? "✓" : step}
    </span>
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  </div>
);

const ClarityPanel = () => (
  <div className="rounded-xl border border-border bg-background p-6">
    <h3 className="font-semibold text-foreground">What this beta is not</h3>
    <p className="mt-2 text-sm text-muted">
      The account dashboard keeps future OmniLux surfaces available to existing
      users, but they are not proof that the focused household beta ships them.
    </p>
    <ul className="mt-4 space-y-2 text-sm text-muted">
      {[
        "No public artifact is available until an exact digest is approved.",
        "Paid plans, Lifetime, and Founding Member checkout remain closed.",
        "Managed media, broad native clients, gaming, and AI are outside this beta lane.",
        "Your local server remains usable without an active cloud session.",
      ].map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
    <a
      href={buildDocsHref("/guide/overview")}
      className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
    >
      Read current product scope
    </a>
  </div>
);
