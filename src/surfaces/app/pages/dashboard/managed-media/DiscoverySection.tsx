import { Lock, PlayCircle, Search, X } from "lucide-react";
import { managedMediaTypeLabels } from "@omnilux/types";
import type { useDiscovery } from "./useDiscovery";
import { mediaTypeOptions, numberFormatter } from "./model";

type DiscoverySectionProps = {
  discovery: ReturnType<typeof useDiscovery>;
};

export const DiscoverySection = ({ discovery }: DiscoverySectionProps) => (
  <section
    id="omnilux-media-catalog"
    className="scroll-mt-28 rounded-xl border border-border bg-background p-6"
  >
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold text-accent">
          Available from OmniLux
        </p>
        <h2 className="mt-2 text-xl font-bold text-foreground">
          Browse what is available to your account
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Availability can vary by account, plan, region, rights window, and
          device. Locked items stay visible only when they help explain what is
          required next.
        </p>
        {discovery.cloudDiscovery?.result ? (
          <p className="mt-2 text-xs text-muted">
            {numberFormatter.format(discovery.cloudDiscovery.result.returned)}{" "}
            of{" "}
            {numberFormatter.format(
              discovery.cloudDiscovery.result.totalMatched
            )}{" "}
            matching cloud items
            {discovery.cloudDiscovery.result.capped ? " shown" : ""}.
          </p>
        ) : null}
      </div>
      <label className="relative block w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={discovery.query}
          onChange={(event) => discovery.setQuery(event.target.value)}
          placeholder="Search previews"
          className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>
    </div>

    {discovery.isCloudDiscoveryLoading || discovery.cloudDiscoveryError ? (
      <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        {discovery.isCloudDiscoveryLoading
          ? "Loading managed-media catalog..."
          : "Cloud catalog is unavailable, so fixture previews are shown."}
      </div>
    ) : null}

    {discovery.activePlayback ? (
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-black">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/60">Now playing</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {discovery.activePlayback.title}
            </p>
          </div>
          <button
            type="button"
            onClick={discovery.closePlayback}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
            aria-label="Close playback"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <video
          key={discovery.activePlayback.itemId}
          src={discovery.activePlayback.url}
          controls
          autoPlay
          playsInline
          crossOrigin="use-credentials"
          preload="metadata"
          className="aspect-video w-full bg-black"
        >
          Your browser does not support in-app video playback.
        </video>
      </div>
    ) : null}

    <div className="mt-5 flex flex-wrap gap-2">
      {(["all", ...mediaTypeOptions] as const).map((mediaType) => (
        <button
          key={mediaType}
          type="button"
          onClick={() => discovery.setSelectedType(mediaType)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            discovery.selectedType === mediaType
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {mediaType === "all" ? "All" : managedMediaTypeLabels[mediaType]}
        </button>
      ))}
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {discovery.discoveryItems.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-border bg-surface p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
              {managedMediaTypeLabels[item.mediaType]}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
              {item.provider.displayName}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
              {item.availability.territories.join(", ")}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">
            {item.title}
          </h3>
          {item.subtitle ? (
            <p className="mt-1 text-sm font-medium text-accent">
              {item.subtitle}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-muted">
            {item.description}
          </p>
          <div className="mt-4 rounded-lg bg-background/70 p-4">
            <div className="flex items-start gap-3">
              {item.entitlement.playbackAllowed ? (
                <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              ) : (
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.availability.status === "playable"
                    ? "Playable"
                    : item.availability.status}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {item.entitlement.message}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => discovery.setSelectedDiscoveryItemId(item.id)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
            >
              <Search className="h-4 w-4" />
              {discovery.selectedDiscoveryItemId === item.id
                ? "Details shown"
                : "View details"}
            </button>
            {item.entitlement.playbackAllowed && item.playback ? (
              <button
                type="button"
                onClick={() => void discovery.launchDiscoveryItem(item)}
                disabled={discovery.playbackLaunchItemId === item.id}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" />
                {discovery.playbackLaunchItemId === item.id
                  ? "Preparing..."
                  : "Play here"}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>

    {discovery.selectedDetailItem ? (
      <article className="mt-6 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold text-accent">Catalog detail</p>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              {discovery.selectedDetailItem.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {discovery.selectedDetailItem.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => discovery.setSelectedDiscoveryItemId(null)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
          >
            Close
          </button>
        </div>
        {discovery.isSelectedCatalogItemDetailLoading ? (
          <p className="mt-4 text-sm text-muted">
            Loading cloud catalog detail...
          </p>
        ) : null}
        {discovery.selectedCatalogItemDetailError ? (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
            Cloud catalog detail is unavailable, so the discovery summary is
            shown.
          </p>
        ) : null}
        <dl className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["Provider", discovery.selectedDetailItem.provider.displayName],
            ["Status", discovery.selectedDetailItem.availability.status],
            [
              "Release",
              discovery.selectedCatalogItemDetail?.release.releaseVersionKey ??
                discovery.selectedDetailItem.playback?.releaseVersionId ??
                "Preview",
            ],
            [
              "Policy",
              discovery.selectedCatalogItemDetail?.policy.decision ??
                (discovery.selectedDetailItem.entitlement.playbackAllowed
                  ? "allow"
                  : "preview-only"),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-background/70 p-3"
            >
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {discovery.selectedCatalogDetailFacts.length > 0 ? (
          <dl className="mt-4 grid gap-3 md:grid-cols-3">
            {discovery.selectedCatalogDetailFacts.map((fact) => (
              <div
                key={`${fact.label}-${fact.value}`}
                className="rounded-lg border border-border bg-background/70 p-3"
              >
                <dt className="text-xs font-semibold text-muted">
                  {fact.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-foreground">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </article>
    ) : null}
  </section>
);
