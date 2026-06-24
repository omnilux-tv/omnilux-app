import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  type ManagedMediaAssetDeliverySourceType,
  type ManagedMediaProviderAssetDeliveryResponse,
  type ManagedMediaProviderAssetDeliverySubmitRequest,
  type ManagedMediaProviderCatalogItemResponse,
  type ManagedMediaProviderCatalogItemUpsertRequest,
  type ManagedMediaProviderReleaseVersionResponse,
  type ManagedMediaProviderReleaseVersionUpsertRequest,
  type ManagedMediaProviderReportExportResponse,
  type ManagedMediaProviderReportExportType,
  type ManagedMediaProviderRequestPriority,
  type ManagedMediaProviderRequestSubmitRequest,
  type ManagedMediaProviderRequestType,
  type ManagedMediaProviderRightsPolicyResponse,
  type ManagedMediaProviderRightsPolicyUpsertRequest,
  type ManagedMediaProviderWritableCatalogStatus,
  type ManagedMediaProviderWritableReleaseStatus,
  type ManagedMediaProviderWorkspacesResponse,
  type ManagedMediaType,
} from '@omnilux/types';
import { invokeCloudFunction } from '@/surfaces/app/lib/cloud-functions';
import {
  downloadTextFile,
  numberFormatter,
  providerUnitKindLabels,
  splitCommaList,
  toIsoTimestamp,
} from './model';

const providerQueryKey = ['managed-media-provider-workspaces'];

export const useProviderWorkspace = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [request, setRequest] = useState({
    requestType: 'support' as ManagedMediaProviderRequestType,
    priority: 'normal' as ManagedMediaProviderRequestPriority,
    title: '',
    message: '',
    itemId: '',
    releaseVersionId: '',
    rightsPolicyId: '',
  });
  const [catalog, setCatalog] = useState({
    externalItemKey: '',
    title: '',
    mediaType: 'video' as ManagedMediaType,
    lifecycleStatus: 'draft' as ManagedMediaProviderWritableCatalogStatus,
    description: '',
    territories: 'US',
    tags: '',
  });
  const [release, setRelease] = useState({
    itemId: '',
    releaseVersionKey: '',
    versionNumber: '1',
    lifecycleStatus: 'draft' as ManagedMediaProviderWritableReleaseStatus,
    rightsPolicyId: '',
    synopsis: '',
    assetKinds: 'source, poster, captions',
  });
  const [delivery, setDelivery] = useState({
    deliveryKey: '',
    sourceType: 'upload' as ManagedMediaAssetDeliverySourceType,
    priority: 'normal' as ManagedMediaProviderRequestPriority,
    title: '',
    description: '',
    sourceUri: '',
    assetKinds: 'source, poster, captions',
    expectedFiles: '',
    itemId: '',
    releaseVersionId: '',
  });
  const [rights, setRights] = useState({
    policyKey: '',
    rightsVersion: 'v1',
    mediaType: 'video' as ManagedMediaType,
    contractReference: '',
    territories: 'US',
    requiredPlans: 'managed-media',
    allowedActions: 'preview',
    effectiveAt: '',
    expiresAt: '',
  });

  const workspacesQuery = useQuery({
    queryKey: providerQueryKey,
    queryFn: async () => {
      const data = await invokeCloudFunction<ManagedMediaProviderWorkspacesResponse>(
        'list-my-managed-media-provider-workspaces',
      );
      return data?.workspaces ?? [];
    },
    enabled,
  });

  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((entry) => entry.provider.id === selectedProviderId) ?? workspaces[0] ?? null;
  const catalogItems = workspace?.catalogItems ?? [];
  const releaseVersions = workspace?.releaseVersions ?? [];
  const selectedReleaseItem = catalogItems.find((item) => item.id === release.itemId) ?? catalogItems[0] ?? null;
  const releaseVersionNumberValue = Number.parseInt(release.versionNumber, 10);
  const selectedRequestReleaseVersion = releaseVersions.find((entry) => entry.id === request.releaseVersionId) ?? null;
  const selectedRequestItem = catalogItems.find((item) => item.id === (selectedRequestReleaseVersion?.itemId ?? request.itemId)) ?? null;
  const requestReleaseOptions = releaseVersions.filter((entry) => !selectedRequestItem || entry.itemId === selectedRequestItem.id);
  const selectedDeliveryReleaseVersion = releaseVersions.find((entry) => entry.id === delivery.releaseVersionId) ?? null;
  const selectedDeliveryItem = catalogItems.find((item) => item.id === (selectedDeliveryReleaseVersion?.itemId ?? delivery.itemId)) ?? null;
  const deliveryReleaseOptions = releaseVersions.filter((entry) => !selectedDeliveryItem || entry.itemId === selectedDeliveryItem.id);

  const capabilities = useMemo(() => new Set(workspace?.membership.capabilities ?? []), [workspace]);
  const providerRequestCapability =
    request.requestType === 'support'
      ? capabilities.has('provider:read')
      : request.requestType === 'issue_response'
        ? capabilities.has('issues:respond')
        : ['rights_review', 'takedown', 'rollback'].includes(request.requestType)
          ? capabilities.has('rights:write')
          : capabilities.has('catalog:write');
  const providerCatalogCapability = capabilities.has('catalog:write');
  const providerRightsCapability = capabilities.has('rights:write');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: providerQueryKey });
  const mutationError = (fallback: string) => (error: unknown) => setMessage(error instanceof Error ? error.message : fallback);

  const submitProviderRequest = useMutation({
    mutationFn: (body: ManagedMediaProviderRequestSubmitRequest) =>
      invokeCloudFunction('submit-my-managed-media-provider-request', { body }),
    onSuccess: async () => {
      setMessage('Request submitted to OmniLux operators.');
      setRequest((current) => ({ ...current, title: '', message: '', itemId: '', releaseVersionId: '', rightsPolicyId: '' }));
      await invalidate();
    },
    onError: mutationError('Provider request could not be submitted.'),
  });
  const submitCatalogItem = useMutation({
    mutationFn: (body: ManagedMediaProviderCatalogItemUpsertRequest) =>
      invokeCloudFunction<ManagedMediaProviderCatalogItemResponse>('upsert-my-managed-media-catalog-item', { body }),
    onSuccess: async (result) => {
      setMessage(`Catalog draft saved: ${result?.item.title ?? catalog.title.trim()}.`);
      setCatalog((current) => ({ ...current, externalItemKey: '', title: '', description: '', tags: '' }));
      await invalidate();
    },
    onError: mutationError('Catalog draft could not be saved.'),
  });
  const submitReleaseVersion = useMutation({
    mutationFn: (body: ManagedMediaProviderReleaseVersionUpsertRequest) =>
      invokeCloudFunction<ManagedMediaProviderReleaseVersionResponse>('upsert-my-managed-media-release-version', { body }),
    onSuccess: async (result) => {
      setMessage(`Release draft saved: ${result?.releaseVersion.releaseVersionKey ?? release.releaseVersionKey.trim()}.`);
      setRelease((current) => ({ ...current, releaseVersionKey: '', versionNumber: '1', synopsis: '', assetKinds: 'source, poster, captions' }));
      await invalidate();
    },
    onError: mutationError('Release draft could not be saved.'),
  });
  const submitAssetDelivery = useMutation({
    mutationFn: (body: ManagedMediaProviderAssetDeliverySubmitRequest) =>
      invokeCloudFunction<ManagedMediaProviderAssetDeliveryResponse>('submit-my-managed-media-asset-delivery', { body }),
    onSuccess: async (result) => {
      setMessage(`Asset delivery submitted: ${result?.assetDelivery.title ?? delivery.title.trim()}.`);
      setDelivery((current) => ({
        ...current,
        deliveryKey: '',
        title: '',
        description: '',
        sourceUri: '',
        expectedFiles: '',
        itemId: '',
        releaseVersionId: '',
      }));
      await invalidate();
    },
    onError: mutationError('Asset delivery could not be submitted.'),
  });
  const submitRightsPolicy = useMutation({
    mutationFn: (body: ManagedMediaProviderRightsPolicyUpsertRequest) =>
      invokeCloudFunction<ManagedMediaProviderRightsPolicyResponse>('upsert-my-managed-media-rights-policy', { body }),
    onSuccess: async (result) => {
      setMessage(`Rights policy draft saved: ${result?.rightsPolicy.policyKey ?? rights.policyKey.trim()}.`);
      setRights((current) => ({ ...current, policyKey: '', contractReference: '' }));
      await invalidate();
    },
    onError: mutationError('Rights policy draft could not be saved.'),
  });
  const exportProviderReport = useMutation({
    mutationFn: async (payload: { providerId: string; windowStart: string; windowEnd: string; reportType: ManagedMediaProviderReportExportType }) => {
      const data = await invokeCloudFunction<ManagedMediaProviderReportExportResponse>('export-my-managed-media-provider-report', {
        body: { ...payload, format: 'csv', source: 'provider-dashboard' },
      });
      if (!data?.csv) throw new Error('Provider report export did not include CSV content.');
      return data;
    },
    onSuccess: (result) => {
      const safeProviderId = result.providerId.replace(/[^a-zA-Z0-9_-]/g, '-');
      const reportLabel = result.reportType === 'settlement-basis' ? 'settlement-basis' : 'item-aggregate';
      downloadTextFile(`managed-media-${safeProviderId}-${reportLabel}-${result.generatedAt.slice(0, 10)}.csv`, result.csv ?? '', 'text/csv;charset=utf-8');
      setMessage(
        result.reportType === 'settlement-basis'
          ? `Settlement basis exported with ${numberFormatter.format(result.rows.length)} aggregate rows.`
          : `Provider report exported with ${numberFormatter.format(result.rows.length)} item rows.`,
      );
    },
    onError: mutationError('Provider report could not be exported.'),
  });

  const selectedProviderUnitLabel = workspace
    ? providerUnitKindLabels[workspace.provider.providerUnitKind ?? 'root'] ?? 'Provider unit'
    : null;

  return {
    workspacesQuery,
    workspaces,
    workspace,
    selectedProviderId,
    setSelectedProviderId,
    selectedProviderUnitLabel,
    selectedProviderHierarchyDepth: workspace?.provider.hierarchy?.depth ?? 0,
    message,
    forms: { request, catalog, release, delivery, rights },
    patch: {
      request: (patch: Partial<typeof request>) => setRequest((current) => ({ ...current, ...patch })),
      catalog: (patch: Partial<typeof catalog>) => setCatalog((current) => ({ ...current, ...patch })),
      release: (patch: Partial<typeof release>) => setRelease((current) => ({ ...current, ...patch })),
      delivery: (patch: Partial<typeof delivery>) => setDelivery((current) => ({ ...current, ...patch })),
      rights: (patch: Partial<typeof rights>) => setRights((current) => ({ ...current, ...patch })),
    },
    derived: {
      catalogItems,
      releaseVersions,
      selectedReleaseItem,
      releaseVersionNumberValue,
      selectedRequestItem,
      selectedRequestReleaseVersion,
      requestReleaseOptions,
      selectedDeliveryItem,
      selectedDeliveryReleaseVersion,
      deliveryReleaseOptions,
      providerRequestCapability,
      providerCatalogCapability,
      providerRightsCapability,
    },
    mutations: { submitProviderRequest, submitCatalogItem, submitReleaseVersion, submitAssetDelivery, submitRightsPolicy, exportProviderReport },
    helpers: { splitCommaList, toIsoTimestamp },
  };
};

export type ProviderWorkspaceViewModel = ReturnType<typeof useProviderWorkspace>;
