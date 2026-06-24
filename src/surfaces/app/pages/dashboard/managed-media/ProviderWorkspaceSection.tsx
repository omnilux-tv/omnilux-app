import { CatalogRightsForms } from './CatalogRightsForms';
import { ProviderRequestPanel } from './ProviderRequestPanel';
import { ProviderSummary } from './ProviderSummary';
import { ReleaseDeliveryForms } from './ReleaseDeliveryForms';
import type { ProviderWorkspaceViewModel } from './useProviderWorkspace';

type ProviderWorkspaceSectionProps = {
  vm: ProviderWorkspaceViewModel;
};

export const ProviderWorkspaceSection = ({ vm }: ProviderWorkspaceSectionProps) => {
  const shouldRender = vm.workspaces.length > 0 || vm.workspacesQuery.isLoading || vm.workspacesQuery.error;
  if (!shouldRender) return null;

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-accent">Provider workspace</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">Media partner workspace</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Submit scoped catalog drafts, rights policy drafts, and operator requests for your provider account.
          </p>
        </div>
        {vm.workspace ? (
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted">
            {vm.workspace.membership.role}
          </span>
        ) : null}
      </div>

      {vm.workspacesQuery.error ? (
        <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
          {vm.workspacesQuery.error instanceof Error ? vm.workspacesQuery.error.message : 'Provider workspace could not be loaded.'}
        </div>
      ) : null}
      {vm.message ? <div className="mt-5 rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm text-foreground">{vm.message}</div> : null}
      {vm.workspacesQuery.isLoading ? (
        <div className="mt-5 space-y-3">
          <div className="h-12 animate-pulse rounded-lg bg-surface" />
          <div className="h-12 animate-pulse rounded-lg bg-surface" />
        </div>
      ) : vm.workspace ? (
        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-xs font-semibold text-muted">Provider</span>
            <select
              value={vm.workspace.provider.id}
              onChange={(event) => vm.setSelectedProviderId(event.currentTarget.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
            >
              {vm.workspaces.map((workspace) => (
                <option key={workspace.provider.id} value={workspace.provider.id}>
                  {workspace.provider.displayName}
                </option>
              ))}
            </select>
            {vm.selectedProviderUnitLabel ? (
              <span className="mt-2 block text-xs text-muted">
                {vm.selectedProviderUnitLabel}
                {vm.selectedProviderHierarchyDepth > 0
                  ? ` - ${vm.selectedProviderHierarchyDepth} level${vm.selectedProviderHierarchyDepth === 1 ? '' : 's'} below root`
                  : ''}
              </span>
            ) : null}
          </label>
          <ProviderSummary vm={vm} />
          <CatalogRightsForms vm={vm} />
          <ReleaseDeliveryForms vm={vm} />
          <ProviderRequestPanel vm={vm} />
        </div>
      ) : null}
    </section>
  );
};
