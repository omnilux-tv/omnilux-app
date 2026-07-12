import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Waves } from "lucide-react";
import { buildDocsHref } from "@/lib/site-surface";
import { useAuth } from "@/providers/AuthProvider";
import { useCustomerOverview } from "@/surfaces/app/lib/customer-overview";
import { AccessOverview } from "./managed-media/AccessOverview";
import { DiscoverySection } from "./managed-media/DiscoverySection";
import { ProviderWorkspaceSection } from "./managed-media/ProviderWorkspaceSection";
import { useDiscovery } from "./managed-media/useDiscovery";
import { useProviderWorkspace } from "./managed-media/useProviderWorkspace";
import { useRuntimeAccess } from "./managed-media/useRuntimeAccess";

export const ManagedMedia = () => {
  const { getAccessToken } = useAuth();
  const { data: overview, error, isLoading } = useCustomerOverview();
  const runtime = useRuntimeAccess({ overview });
  const discovery = useDiscovery({
    enabled: Boolean(overview),
    getAccessToken,
    managedMediaOrigin: runtime.managedMediaOrigin,
    setLaunchError: runtime.setLaunchError,
  });
  const providerWorkspace = useProviderWorkspace(Boolean(overview));
  const operatingMode =
    overview?.platform.managedMediaOperatingMode ?? "normal";

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-medium text-muted">From OmniLux</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
            Media from OmniLux
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Browse media offered by OmniLux and play what is available to your
            account. This experience stays separate from the private libraries
            on your self-hosted server.
          </p>
        </div>

        {overview &&
        (operatingMode !== "normal" ||
          overview.platform.managedMediaIncidentMessage) ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
            <p className="text-xs font-semibold text-warning">Service status</p>
            <p className="mt-2 text-lg font-semibold">
              {overview.platform.managedMediaOperatingModeLabel}
            </p>
            <p className="mt-2 text-muted">
              {overview.platform.managedMediaIncidentMessage ||
                "OmniLux has published a service notice for managed media."}
            </p>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-foreground">
            {error instanceof Error
              ? error.message
              : "Managed media status could not be loaded."}
          </div>
        ) : null}
        {runtime.launchError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-foreground">
            {runtime.launchError}
          </div>
        ) : null}

        <AccessOverview
          overview={overview}
          isLoading={isLoading}
          managedMediaAvailable={runtime.managedMediaAvailable}
        />
        <DiscoverySection discovery={discovery} />
        <ProviderWorkspaceSection vm={providerWorkspace} />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Waves,
              title: "What it is",
              body: "Media supplied by OmniLux from approved partner, studio, and first-party sources.",
            },
            {
              icon: ShieldCheck,
              title: "What it is not",
              body: "It is not a replacement for your self-hosted server, your LAN playback, or your private reverse-proxy setup.",
            },
            {
              icon: Sparkles,
              title: "Where to go next",
              body: "Browse and start available playback here. OmniLux connects to the protected media service for you.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-background p-5"
            >
              <Icon className="h-5 w-5 text-accent" />
              <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-semibold text-foreground">
            Self-hosted servers still matter
          </h2>
          <p className="mt-2 text-sm text-muted">
            Managed media can appear beside local libraries in discovery later,
            but your OmniLux server is still where your own libraries, direct
            access, and server-level control live.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/dashboard/servers"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              View linked servers
            </Link>
            <a
              href={buildDocsHref("/guide/cloud-product-contract")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Review the product contract
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
