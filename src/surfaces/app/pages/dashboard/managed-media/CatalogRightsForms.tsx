import { managedMediaTypeLabels, type ManagedMediaType } from '@omnilux/types';
import { Field, inputClass, primaryButtonClass, textareaClass, Warning } from './form-controls';
import {
  mediaTypeOptions,
  providerCatalogStatuses,
  requestStatusLabel,
} from './model';
import type { ProviderWorkspaceViewModel } from './useProviderWorkspace';

type CatalogRightsFormsProps = {
  vm: ProviderWorkspaceViewModel;
};

export const CatalogRightsForms = ({ vm }: CatalogRightsFormsProps) => {
  const workspace = vm.workspace;
  if (!workspace) return null;
  const { catalog, rights } = vm.forms;
  const catalogDisabled =
    vm.mutations.submitCatalogItem.isPending ||
    !vm.derived.providerCatalogCapability ||
    catalog.title.trim().length < 3;
  const rightsDisabled =
    vm.mutations.submitRightsPolicy.isPending ||
    !vm.derived.providerRightsCapability ||
    rights.policyKey.trim().length < 3 ||
    rights.rightsVersion.trim().length < 1;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <CardHeader label="Catalog draft" title="Submit media metadata" count={`${workspace.catalogItems.length} items`} />
        <div className="mt-4 space-y-3">
          <Field label="Title">
            <input value={catalog.title} onChange={(event) => vm.patch.catalog({ title: event.currentTarget.value })} className={inputClass} placeholder="Release or working title" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Media type">
              <select value={catalog.mediaType} onChange={(event) => vm.patch.catalog({ mediaType: event.currentTarget.value as ManagedMediaType })} className={inputClass}>
                {mediaTypeOptions.map((type) => <option key={type} value={type}>{managedMediaTypeLabels[type]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={catalog.lifecycleStatus} onChange={(event) => vm.patch.catalog({ lifecycleStatus: event.currentTarget.value as typeof catalog.lifecycleStatus })} className={inputClass}>
                {providerCatalogStatuses.map((status) => <option key={status} value={status}>{requestStatusLabel(status)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Provider key">
            <input value={catalog.externalItemKey} onChange={(event) => vm.patch.catalog({ externalItemKey: event.currentTarget.value })} className={inputClass} placeholder="optional stable id" />
          </Field>
          <Field label="Description">
            <textarea value={catalog.description} onChange={(event) => vm.patch.catalog({ description: event.currentTarget.value })} rows={3} className={textareaClass} placeholder="Synopsis, editorial note, or catalog context" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Territories">
              <input value={catalog.territories} onChange={(event) => vm.patch.catalog({ territories: event.currentTarget.value })} className={inputClass} placeholder="US, CA" />
            </Field>
            <Field label="Tags">
              <input value={catalog.tags} onChange={(event) => vm.patch.catalog({ tags: event.currentTarget.value })} className={inputClass} placeholder="documentary, preview" />
            </Field>
          </div>
          {!vm.derived.providerCatalogCapability ? <Warning>This provider role cannot submit catalog drafts.</Warning> : null}
          <button
            type="button"
            disabled={catalogDisabled}
            onClick={() => {
              vm.mutations.submitCatalogItem.mutate({
                providerId: workspace.provider.id,
                externalItemKey: catalog.externalItemKey.trim() || null,
                mediaType: catalog.mediaType,
                title: catalog.title.trim(),
                lifecycleStatus: catalog.lifecycleStatus,
                metadata: {
                  description: catalog.description.trim() || undefined,
                  territories: vm.helpers.splitCommaList(catalog.territories),
                  tags: vm.helpers.splitCommaList(catalog.tags),
                  submittedFrom: 'omnilux-app-provider-workspace',
                },
                source: 'provider-dashboard',
              });
            }}
            className={primaryButtonClass}
          >
            {vm.mutations.submitCatalogItem.isPending ? 'Saving...' : 'Save catalog draft'}
          </button>
        </div>
        <RecentCatalog vm={vm} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <CardHeader label="Rights draft" title="Submit policy inputs" count={`${workspace.rightsPolicies.length} policies`} />
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Policy key">
              <input value={rights.policyKey} onChange={(event) => vm.patch.rights({ policyKey: event.currentTarget.value })} className={inputClass} placeholder="studio-preview" />
            </Field>
            <Field label="Version">
              <input value={rights.rightsVersion} onChange={(event) => vm.patch.rights({ rightsVersion: event.currentTarget.value })} className={inputClass} placeholder="v1" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Media type">
              <select value={rights.mediaType} onChange={(event) => vm.patch.rights({ mediaType: event.currentTarget.value as ManagedMediaType })} className={inputClass}>
                {mediaTypeOptions.map((type) => <option key={type} value={type}>{managedMediaTypeLabels[type]}</option>)}
              </select>
            </Field>
            <Field label="Contract ref">
              <input value={rights.contractReference} onChange={(event) => vm.patch.rights({ contractReference: event.currentTarget.value })} className={inputClass} placeholder="optional internal reference" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Territories">
              <input value={rights.territories} onChange={(event) => vm.patch.rights({ territories: event.currentTarget.value })} className={inputClass} placeholder="US, CA" />
            </Field>
            <Field label="Required plans">
              <input value={rights.requiredPlans} onChange={(event) => vm.patch.rights({ requiredPlans: event.currentTarget.value })} className={inputClass} placeholder="managed-media" />
            </Field>
          </div>
          <Field label="Allowed actions">
            <input value={rights.allowedActions} onChange={(event) => vm.patch.rights({ allowedActions: event.currentTarget.value })} className={inputClass} placeholder="preview, play" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Effective">
              <input type="datetime-local" value={rights.effectiveAt} onChange={(event) => vm.patch.rights({ effectiveAt: event.currentTarget.value })} className={inputClass} />
            </Field>
            <Field label="Expires">
              <input type="datetime-local" value={rights.expiresAt} onChange={(event) => vm.patch.rights({ expiresAt: event.currentTarget.value })} className={inputClass} />
            </Field>
          </div>
          {!vm.derived.providerRightsCapability ? <Warning>This provider role cannot submit rights drafts.</Warning> : null}
          <button
            type="button"
            disabled={rightsDisabled}
            onClick={() => {
              const territories = vm.helpers.splitCommaList(rights.territories);
              const requiredPlans = vm.helpers.splitCommaList(rights.requiredPlans);
              const allowedActions = vm.helpers.splitCommaList(rights.allowedActions);
              vm.mutations.submitRightsPolicy.mutate({
                providerId: workspace.provider.id,
                policyKey: rights.policyKey.trim(),
                rightsVersion: rights.rightsVersion.trim(),
                mediaType: rights.mediaType,
                contractReference: rights.contractReference.trim() || null,
                visibilityRules: { publicVisible: false, signedInVisible: true, territories },
                playbackRules: { allowedActions: allowedActions.length > 0 ? allowedActions : ['preview'], requiredPlans, territories },
                deliveryRules: { deliveryPolicyId: 'managed-media-default-delivery', offlineAllowed: allowedActions.includes('offline-renew') },
                reportingRules: { usageEventsRequired: true, aggregateProviderReports: true },
                revenueRules: { settlementRequired: false },
                takedownRules: { providerMayRequestTakedown: true },
                effectiveAt: vm.helpers.toIsoTimestamp(rights.effectiveAt),
                expiresAt: vm.helpers.toIsoTimestamp(rights.expiresAt) ?? null,
                source: 'provider-dashboard',
              });
            }}
            className={primaryButtonClass}
          >
            {vm.mutations.submitRightsPolicy.isPending ? 'Saving...' : 'Save rights draft'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CardHeader = ({ label, title, count }: { label: string; title: string; count: string }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <h3 className="mt-1 font-semibold text-foreground">{title}</h3>
    </div>
    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">{count}</span>
  </div>
);

const RecentCatalog = ({ vm }: CatalogRightsFormsProps) => (
  <div className="mt-5 border-t border-border pt-4">
    <p className="text-xs font-semibold text-muted">Recent catalog items</p>
    {(vm.workspace?.catalogItems.length ?? 0) === 0 ? (
      <p className="mt-3 text-sm leading-6 text-muted">No catalog drafts have been created for this provider.</p>
    ) : (
      <div className="mt-3 space-y-2">
        {vm.workspace?.catalogItems.slice(0, 4).map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-background/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">{managedMediaTypeLabels[item.mediaType]}</span>
              <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">{requestStatusLabel(item.lifecycleStatus)}</span>
            </div>
            <h4 className="mt-2 text-sm font-semibold text-foreground">{item.title}</h4>
          </article>
        ))}
      </div>
    )}
  </div>
);
