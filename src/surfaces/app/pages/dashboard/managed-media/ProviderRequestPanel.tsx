import {
  Field,
  Pill,
  primaryButtonClass,
  surfaceInputClass,
  Warning,
} from './form-controls';
import {
  providerRequestPriorities,
  providerRequestTypeLabels,
  providerRequestTypes,
  requestStatusLabel,
} from './model';
import type { ProviderWorkspaceViewModel } from './useProviderWorkspace';

type ProviderRequestPanelProps = {
  vm: ProviderWorkspaceViewModel;
};

export const ProviderRequestPanel = ({ vm }: ProviderRequestPanelProps) => {
  const workspace = vm.workspace;
  if (!workspace) return null;
  const { request } = vm.forms;
  const disabled =
    vm.mutations.submitProviderRequest.isPending ||
    !vm.derived.providerRequestCapability ||
    request.title.trim().length < 3 ||
    request.message.trim().length < 4;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-xs font-semibold text-muted">Operator request</p>
          <h3 className="mt-1 font-semibold text-foreground">Ask OmniLux to review or act</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Request type">
            <select value={request.requestType} onChange={(event) => vm.patch.request({ requestType: event.currentTarget.value as typeof request.requestType })} className={surfaceInputClass}>
              {providerRequestTypes.map((type) => <option key={type} value={type}>{providerRequestTypeLabels[type]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={request.priority} onChange={(event) => vm.patch.request({ priority: event.currentTarget.value as typeof request.priority })} className={surfaceInputClass}>
              {providerRequestPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Catalog item">
            <select
              value={vm.derived.selectedRequestItem?.id ?? ''}
              onChange={(event) => vm.patch.request({ itemId: event.currentTarget.value, releaseVersionId: '' })}
              className={surfaceInputClass}
            >
              <option value="">No item link</option>
              {vm.derived.catalogItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </Field>
          <Field label="Release">
            <select
              value={vm.derived.selectedRequestReleaseVersion?.id ?? ''}
              onChange={(event) => {
                const release = vm.derived.releaseVersions.find((entry) => entry.id === event.currentTarget.value);
                vm.patch.request({ releaseVersionId: event.currentTarget.value, itemId: release?.itemId ?? request.itemId });
              }}
              disabled={vm.derived.requestReleaseOptions.length === 0}
              className={surfaceInputClass}
            >
              <option value="">No release link</option>
              {vm.derived.requestReleaseOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.releaseVersionKey} v{entry.versionNumber}</option>)}
            </select>
          </Field>
          <Field label="Rights policy">
            <select value={request.rightsPolicyId} onChange={(event) => vm.patch.request({ rightsPolicyId: event.currentTarget.value })} className={surfaceInputClass}>
              <option value="">No rights link</option>
              {workspace.rightsPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.policyKey} {policy.rightsVersion}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Title">
          <input value={request.title} onChange={(event) => vm.patch.request({ title: event.currentTarget.value })} className={surfaceInputClass} placeholder="Short operator-facing summary" />
        </Field>
        <Field label="Message">
          <textarea value={request.message} onChange={(event) => vm.patch.request({ message: event.currentTarget.value })} rows={4} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent" placeholder="Describe the media, release, rights, or support context." />
        </Field>
        {!vm.derived.providerRequestCapability ? <Warning>This provider role cannot submit the selected request type.</Warning> : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            vm.mutations.submitProviderRequest.mutate({
              providerId: workspace.provider.id,
              itemId: vm.derived.selectedRequestItem?.id ?? null,
              releaseVersionId: vm.derived.selectedRequestReleaseVersion?.id ?? null,
              rightsPolicyId: request.rightsPolicyId || null,
              requestType: request.requestType,
              priority: request.priority,
              title: request.title.trim(),
              message: request.message.trim(),
              metadata: {
                itemTitle: vm.derived.selectedRequestItem?.title ?? null,
                releaseVersionKey: vm.derived.selectedRequestReleaseVersion?.releaseVersionKey ?? null,
                submittedFrom: 'omnilux-app-provider-workspace',
              },
              source: 'provider-dashboard',
            });
          }}
          className={primaryButtonClass}
        >
          {vm.mutations.submitProviderRequest.isPending ? 'Submitting...' : 'Submit request'}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold text-muted">Recent requests</p>
        {workspace.providerRequests.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted">No requests have been submitted for this provider.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {workspace.providerRequests.slice(0, 6).map((entry) => {
              const item = vm.derived.catalogItems.find((catalogItem) => catalogItem.id === entry.itemId);
              const release = vm.derived.releaseVersions.find((releaseVersion) => releaseVersion.id === entry.releaseVersionId);
              const rightsPolicy = workspace.rightsPolicies.find((policy) => policy.id === entry.rightsPolicyId);
              return (
                <article key={entry.id} className="rounded-lg border border-border bg-background/70 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                      {providerRequestTypeLabels[entry.requestType]}
                    </span>
                    <Pill>{requestStatusLabel(entry.status)}</Pill>
                    {release ? <Pill>{release.releaseVersionKey} v{release.versionNumber}</Pill> : item ? <Pill>{item.title}</Pill> : null}
                    {rightsPolicy ? <Pill>{rightsPolicy.policyKey}</Pill> : null}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{entry.title}</h3>
                  {entry.operatorResponse ? <p className="mt-2 text-xs leading-5 text-muted">{entry.operatorResponse}</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
