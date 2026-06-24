import { managedMediaTypeLabels } from '@omnilux/types';
import { Field, inputClass, primaryButtonClass, textareaClass, Warning } from './form-controls';
import {
  providerAssetDeliverySourceLabels,
  providerAssetDeliverySourceTypes,
  providerReleaseStatuses,
  providerRequestPriorities,
  requestStatusLabel,
} from './model';
import type { ProviderWorkspaceViewModel } from './useProviderWorkspace';

type ReleaseDeliveryFormsProps = {
  vm: ProviderWorkspaceViewModel;
};

export const ReleaseDeliveryForms = ({ vm }: ReleaseDeliveryFormsProps) => {
  const workspace = vm.workspace;
  if (!workspace) return null;
  const { release, delivery } = vm.forms;
  const releaseDisabled =
    vm.mutations.submitReleaseVersion.isPending ||
    !vm.derived.providerCatalogCapability ||
    !vm.derived.selectedReleaseItem ||
    release.releaseVersionKey.trim().length < 3 ||
    !Number.isInteger(vm.derived.releaseVersionNumberValue) ||
    vm.derived.releaseVersionNumberValue < 1;
  const deliveryDisabled =
    vm.mutations.submitAssetDelivery.isPending ||
    !vm.derived.providerCatalogCapability ||
    delivery.deliveryKey.trim().length < 3 ||
    delivery.title.trim().length < 3 ||
    (!['upload', 'manual-ops'].includes(delivery.sourceType) && delivery.sourceUri.trim().length < 5);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4">
        <CardHeader label="Release draft" title="Bundle metadata for operator review" count={`${vm.derived.releaseVersions.length} releases`} />
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Catalog item">
                <select value={vm.derived.selectedReleaseItem?.id ?? ''} onChange={(event) => vm.patch.release({ itemId: event.currentTarget.value })} disabled={vm.derived.catalogItems.length === 0} className={inputClass}>
                  {vm.derived.catalogItems.length === 0 ? <option value="">Create a catalog draft first</option> : null}
                  {vm.derived.catalogItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={release.lifecycleStatus} onChange={(event) => vm.patch.release({ lifecycleStatus: event.currentTarget.value as typeof release.lifecycleStatus })} className={inputClass}>
                  {providerReleaseStatuses.map((status) => <option key={status} value={status}>{requestStatusLabel(status)}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
              <Field label="Release key">
                <input value={release.releaseVersionKey} onChange={(event) => vm.patch.release({ releaseVersionKey: event.currentTarget.value })} className={inputClass} placeholder="fall-release-v1" />
              </Field>
              <Field label="Version">
                <input type="number" min={1} value={release.versionNumber} onChange={(event) => vm.patch.release({ versionNumber: event.currentTarget.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Rights policy">
              <select value={release.rightsPolicyId} onChange={(event) => vm.patch.release({ rightsPolicyId: event.currentTarget.value })} className={inputClass}>
                <option value="">No policy link yet</option>
                {workspace.rightsPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.policyKey} {policy.rightsVersion}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Asset kinds">
                <input value={release.assetKinds} onChange={(event) => vm.patch.release({ assetKinds: event.currentTarget.value })} className={inputClass} placeholder="source, poster, captions" />
              </Field>
              <Field label="Synopsis">
                <input value={release.synopsis} onChange={(event) => vm.patch.release({ synopsis: event.currentTarget.value })} className={inputClass} placeholder="Release notes or synopsis" />
              </Field>
            </div>
            {!vm.derived.providerCatalogCapability ? <Warning>This provider role cannot submit release drafts.</Warning> : null}
            <button
              type="button"
              disabled={releaseDisabled}
              onClick={() => {
                const selectedItem = vm.derived.selectedReleaseItem;
                if (!selectedItem) return;
                vm.mutations.submitReleaseVersion.mutate({
                  providerId: workspace.provider.id,
                  itemId: selectedItem.id,
                  releaseVersionKey: release.releaseVersionKey.trim(),
                  versionNumber: vm.derived.releaseVersionNumberValue,
                  lifecycleStatus: release.lifecycleStatus,
                  rightsPolicyId: release.rightsPolicyId || null,
                  metadataSnapshot: {
                    title: selectedItem.title,
                    mediaType: selectedItem.mediaType,
                    synopsis: release.synopsis.trim() || undefined,
                    submittedFrom: 'omnilux-app-provider-workspace',
                  },
                  assetsSnapshot: { expectedAssetKinds: vm.helpers.splitCommaList(release.assetKinds), providerSubmitted: true },
                  source: 'provider-dashboard',
                });
              }}
              className={primaryButtonClass}
            >
              {vm.mutations.submitReleaseVersion.isPending ? 'Saving...' : 'Save release draft'}
            </button>
          </div>
          <RecentReleases vm={vm} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <CardHeader label="Asset delivery" title="Submit upload or feed intake" count={`${workspace.assetDeliveries.length} deliveries`} />
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Delivery key">
                <input value={delivery.deliveryKey} onChange={(event) => vm.patch.delivery({ deliveryKey: event.currentTarget.value })} className={inputClass} placeholder="fall-release-source-v1" />
              </Field>
              <Field label="Source type">
                <select value={delivery.sourceType} onChange={(event) => vm.patch.delivery({ sourceType: event.currentTarget.value as typeof delivery.sourceType })} className={inputClass}>
                  {providerAssetDeliverySourceTypes.map((type) => <option key={type} value={type}>{providerAssetDeliverySourceLabels[type]}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
              <Field label="Title">
                <input value={delivery.title} onChange={(event) => vm.patch.delivery({ title: event.currentTarget.value })} className={inputClass} placeholder="Main feature source package" />
              </Field>
              <Field label="Priority">
                <select value={delivery.priority} onChange={(event) => vm.patch.delivery({ priority: event.currentTarget.value as typeof delivery.priority })} className={inputClass}>
                  {providerRequestPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Catalog item">
                <select value={vm.derived.selectedDeliveryItem?.id ?? ''} onChange={(event) => vm.patch.delivery({ itemId: event.currentTarget.value })} className={inputClass}>
                  <option value="">Unlinked intake</option>
                  {vm.derived.catalogItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </Field>
              <Field label="Release version">
                <select value={vm.derived.selectedDeliveryReleaseVersion?.id ?? ''} onChange={(event) => vm.patch.delivery({ releaseVersionId: event.currentTarget.value })} disabled={vm.derived.deliveryReleaseOptions.length === 0} className={inputClass}>
                  <option value="">No release link</option>
                  {vm.derived.deliveryReleaseOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.releaseVersionKey} v{entry.versionNumber}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Source URI">
              <input value={delivery.sourceUri} onChange={(event) => vm.patch.delivery({ sourceUri: event.currentTarget.value })} className={inputClass} placeholder="Required for feeds, origins, SFTP, or buckets" />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Asset kinds">
                <input value={delivery.assetKinds} onChange={(event) => vm.patch.delivery({ assetKinds: event.currentTarget.value })} className={inputClass} placeholder="source, poster, captions" />
              </Field>
              <Field label="Expected files">
                <input value={delivery.expectedFiles} onChange={(event) => vm.patch.delivery({ expectedFiles: event.currentTarget.value })} className={inputClass} placeholder="feature.mov, poster.jpg" />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={delivery.description} onChange={(event) => vm.patch.delivery({ description: event.currentTarget.value })} rows={3} className={textareaClass} placeholder="Packaging notes, version context, captions/audio expectations, or known limitations." />
            </Field>
            {!vm.derived.providerCatalogCapability ? <Warning>This provider role cannot submit asset deliveries.</Warning> : null}
            <button
              type="button"
              disabled={deliveryDisabled}
              onClick={() => {
                const targetRelease = vm.derived.selectedDeliveryReleaseVersion;
                const targetItem = vm.derived.selectedDeliveryItem;
                vm.mutations.submitAssetDelivery.mutate({
                  providerId: workspace.provider.id,
                  itemId: targetItem?.id ?? null,
                  releaseVersionId: targetRelease?.id ?? null,
                  deliveryKey: delivery.deliveryKey.trim(),
                  sourceType: delivery.sourceType,
                  priority: delivery.priority,
                  title: delivery.title.trim(),
                  description: delivery.description.trim() || null,
                  sourceUri: delivery.sourceUri.trim() || null,
                  assetManifest: {
                    assetKinds: vm.helpers.splitCommaList(delivery.assetKinds),
                    expectedFiles: vm.helpers.splitCommaList(delivery.expectedFiles),
                    submittedFrom: 'omnilux-app-provider-workspace',
                  },
                  metadata: {
                    providerWorkspaceId: workspace.provider.id,
                    targetItemTitle: targetItem?.title ?? null,
                    targetReleaseVersionKey: targetRelease?.releaseVersionKey ?? null,
                  },
                  source: 'provider-dashboard',
                });
              }}
              className={primaryButtonClass}
            >
              {vm.mutations.submitAssetDelivery.isPending ? 'Submitting...' : 'Submit delivery'}
            </button>
          </div>
          <RecentDeliveries vm={vm} />
        </div>
      </div>
    </div>
  );
};

const CardHeader = ({ label, title, count }: { label: string; title: string; count: string }) => (
  <div className="flex items-start justify-between gap-4">
    <div><p className="text-xs font-semibold text-muted">{label}</p><h3 className="mt-1 font-semibold text-foreground">{title}</h3></div>
    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">{count}</span>
  </div>
);

const RecentReleases = ({ vm }: ReleaseDeliveryFormsProps) => (
  <div className="rounded-xl border border-border bg-background/70 p-4">
    <p className="text-xs font-semibold text-muted">Recent release versions</p>
    {vm.derived.releaseVersions.length === 0 ? <p className="mt-3 text-sm leading-6 text-muted">No release drafts have been created for this provider.</p> : (
      <div className="mt-3 space-y-3">{vm.derived.releaseVersions.slice(0, 5).map((entry) => {
        const item = vm.derived.catalogItems.find((catalogItem) => catalogItem.id === entry.itemId);
        return <article key={entry.id} className="rounded-lg border border-border bg-surface p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">v{entry.versionNumber}</span><span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">{requestStatusLabel(entry.lifecycleStatus)}</span></div><h4 className="mt-2 text-sm font-semibold text-foreground">{entry.releaseVersionKey}</h4><p className="mt-1 text-xs text-muted">{item?.title ?? entry.itemId}</p></article>;
      })}</div>
    )}
  </div>
);

const RecentDeliveries = ({ vm }: ReleaseDeliveryFormsProps) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <p className="text-xs font-semibold text-muted">Recent deliveries</p>
      {(vm.workspace?.assetDeliveries.length ?? 0) === 0 ? <p className="mt-3 text-sm leading-6 text-muted">No upload, feed, or origin delivery records have been submitted.</p> : (
        <div className="mt-3 space-y-3">{vm.workspace?.assetDeliveries.slice(0, 5).map((entry) => <article key={entry.id} className="rounded-lg border border-border bg-surface p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">{providerAssetDeliverySourceLabels[entry.sourceType]}</span><span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">{requestStatusLabel(entry.status)}</span></div><h4 className="mt-2 text-sm font-semibold text-foreground">{entry.title}</h4><p className="mt-1 font-mono text-[11px] text-muted">{entry.deliveryKey}</p></article>)}</div>
      )}
    </div>
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <p className="text-xs font-semibold text-muted">Ingestion jobs</p>
      {(vm.workspace?.ingestionJobs.length ?? 0) === 0 ? <p className="mt-3 text-sm leading-6 text-muted">No ingestion or QC jobs have been queued for this provider.</p> : (
        <div className="mt-3 space-y-3">{vm.workspace?.ingestionJobs.slice(0, 5).map((job) => <article key={job.id} className="rounded-lg border border-border bg-surface p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">{job.jobType}</span><span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">{requestStatusLabel(job.status)}</span></div><h4 className="mt-2 text-sm font-semibold text-foreground">{job.assetDeliveryId ?? job.id}</h4><p className="mt-1 font-mono text-[11px] text-muted">{job.id}</p></article>)}</div>
      )}
    </div>
  </div>
);
