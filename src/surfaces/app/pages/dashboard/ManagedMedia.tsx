import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  ExternalLink,
  Lock,
  PlayCircle,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { useState } from 'react';
import {
  filterManagedDiscoveryItems,
  managedMediaFixtureItems,
  managedMediaTypeLabels,
  type ManagedDiscoveryItem,
  type ManagedMediaCatalogItemDetailRequest,
  type ManagedMediaCatalogItemDetailResponse,
  type ManagedMediaAssetDeliverySourceType,
  type ManagedMediaDiscoveryRequest,
  type ManagedMediaDiscoveryResponse,
  type ManagedMediaProviderAssetDeliveryResponse,
  type ManagedMediaProviderAssetDeliverySubmitRequest,
  type ManagedMediaProviderCatalogItemResponse,
  type ManagedMediaProviderCatalogItemUpsertRequest,
  type ManagedMediaProviderRequestPriority,
  type ManagedMediaProviderReleaseVersionResponse,
  type ManagedMediaProviderReleaseVersionUpsertRequest,
  type ManagedMediaProviderReportExportResponse,
  type ManagedMediaProviderReportExportType,
  type ManagedMediaProviderRequestSubmitRequest,
  type ManagedMediaProviderRequestType,
  type ManagedMediaProviderRightsPolicyResponse,
  type ManagedMediaProviderRightsPolicyUpsertRequest,
  type ManagedMediaProviderWritableCatalogStatus,
  type ManagedMediaProviderWritableReleaseStatus,
  type ManagedMediaPlaybackGrantIssueRequest,
  type ManagedMediaProviderWorkspace,
  type ManagedMediaProviderWorkspacesResponse,
  type ManagedMediaCatalogDetails,
  type ManagedMediaType,
} from '@omnilux/types';
import { buildDocsHref } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';
import { invokeCloudFunction } from '@/surfaces/app/lib/cloud-functions';
import { useCustomerOverview } from '@/surfaces/app/lib/customer-overview';
import {
  consumeManagedMediaPlaybackGrant,
  establishManagedMediaSession,
  launchManagedMediaPlayback,
  recordManagedMediaUsageEvent,
} from '@/surfaces/app/lib/managed-media-launch';
import { getRelayConditionLabel } from '@/surfaces/app/lib/relay-condition';

const fallbackMediaOrigin = 'https://media.omnilux.tv';
const mediaTypeOptions: readonly ManagedMediaType[] = ['video', 'audio', 'channel', 'live-event', 'game', 'book', 'interactive'];
const providerRequestTypes: ManagedMediaProviderRequestType[] = [
  'publish',
  'qc_review',
  'rights_review',
  'metadata_update',
  'takedown',
  'rollback',
  'support',
  'issue_response',
];
const providerRequestPriorities: ManagedMediaProviderRequestPriority[] = ['low', 'normal', 'high', 'urgent'];
const providerCatalogStatuses: ManagedMediaProviderWritableCatalogStatus[] = ['draft', 'ingesting', 'qc', 'rights_review'];
const providerReleaseStatuses: ManagedMediaProviderWritableReleaseStatus[] = ['draft', 'ingesting', 'qc', 'rights_review'];
const providerAssetDeliverySourceTypes: ManagedMediaAssetDeliverySourceType[] = [
  'upload',
  'feed',
  'origin-url',
  'sftp',
  'storage-bucket',
  'manual-ops',
];
const providerRequestTypeLabels: Record<ManagedMediaProviderRequestType, string> = {
  publish: 'Publish',
  qc_review: 'QC review',
  rights_review: 'Rights review',
  metadata_update: 'Metadata update',
  takedown: 'Takedown',
  rollback: 'Rollback',
  support: 'Support',
  issue_response: 'Issue response',
};
const providerAssetDeliverySourceLabels: Record<ManagedMediaAssetDeliverySourceType, string> = {
  upload: 'Upload',
  feed: 'Feed',
  'origin-url': 'Origin URL',
  sftp: 'SFTP',
  'storage-bucket': 'Storage bucket',
  'manual-ops': 'Manual ops',
};
const providerUnitKindLabels: Record<string, string> = {
  root: 'Root provider',
  label: 'Label',
  studio: 'Studio',
  region: 'Region',
  business_unit: 'Business unit',
};
const numberFormatter = new Intl.NumberFormat();
const reportingDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const requestStatusLabel = (value: string) => value.replaceAll('_', ' ');
const splitCommaList = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const toIsoTimestamp = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const downloadTextFile = (filename: string, contents: string, type: string) => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const joinList = (value: readonly string[] | undefined) => value && value.length > 0 ? value.join(', ') : undefined;
const catalogDetailFacts = (
  mediaType: ManagedMediaType,
  details: ManagedMediaCatalogDetails | undefined,
) => {
  if (!details) return [];
  const common = details.common;
  const facts: Array<{ label: string; value: string | number | undefined }> = [
    { label: 'Original title', value: common?.originalTitle },
    { label: 'Edition', value: common?.edition },
  ];

  if (mediaType === 'video' && details.video) {
    facts.push(
      { label: 'Series', value: details.video.seriesTitle },
      { label: 'Season', value: details.video.seasonNumber },
      { label: 'Episode', value: details.video.episodeNumber },
      { label: 'Runtime', value: details.video.runtimeSeconds ? `${Math.round(details.video.runtimeSeconds / 60)} min` : undefined },
      { label: 'Cast', value: joinList(details.video.cast) },
    );
  }
  if (mediaType === 'audio' && details.audio) {
    facts.push(
      { label: 'Album', value: details.audio.albumTitle },
      { label: 'Track', value: details.audio.trackNumber },
      { label: 'Artists', value: joinList(details.audio.artists) },
      { label: 'Label', value: details.audio.label },
    );
  }
  if (mediaType === 'book' && details.book) {
    facts.push(
      { label: 'Authors', value: joinList(details.book.authors) },
      { label: 'Publisher', value: details.book.publisher },
      { label: 'ISBN', value: details.book.isbn },
      { label: 'Pages', value: details.book.pageCount },
      { label: 'Format', value: details.book.format },
    );
  }
  if (mediaType === 'game' && details.game) {
    facts.push(
      { label: 'Platforms', value: joinList(details.game.platforms) },
      { label: 'Developers', value: joinList(details.game.developers) },
      { label: 'Runtime', value: details.game.runtimeKind },
    );
  }
  if (mediaType === 'live-event' && details.liveEvent) {
    facts.push(
      { label: 'Starts', value: details.liveEvent.eventStartAt },
      { label: 'Ends', value: details.liveEvent.eventEndAt },
      { label: 'Venue', value: details.liveEvent.venue },
      { label: 'Participants', value: joinList(details.liveEvent.participants) },
    );
  }
  if (mediaType === 'channel' && details.channel) {
    facts.push(
      { label: 'Channel', value: details.channel.channelNumber },
      { label: 'Network', value: details.channel.network },
      { label: 'Schedule', value: details.channel.scheduleId },
    );
  }
  if (mediaType === 'interactive' && details.interactive) {
    facts.push(
      { label: 'Experience', value: details.interactive.experienceType },
      { label: 'Input', value: joinList(details.interactive.inputModes) },
    );
  }

  return facts.filter((fact) => fact.value !== undefined && fact.value !== '');
};

export const ManagedMedia = () => {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: overview, error, isLoading } = useCustomerOverview();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [playbackLaunchItemId, setPlaybackLaunchItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ManagedMediaType | 'all'>('all');
  const [selectedDiscoveryItemId, setSelectedDiscoveryItemId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [requestType, setRequestType] = useState<ManagedMediaProviderRequestType>('support');
  const [requestPriority, setRequestPriority] = useState<ManagedMediaProviderRequestPriority>('normal');
  const [requestTitle, setRequestTitle] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestItemId, setRequestItemId] = useState('');
  const [requestReleaseVersionId, setRequestReleaseVersionId] = useState('');
  const [requestRightsPolicyId, setRequestRightsPolicyId] = useState('');
  const [catalogExternalKey, setCatalogExternalKey] = useState('');
  const [catalogTitle, setCatalogTitle] = useState('');
  const [catalogMediaType, setCatalogMediaType] = useState<ManagedMediaType>('video');
  const [catalogLifecycleStatus, setCatalogLifecycleStatus] =
    useState<ManagedMediaProviderWritableCatalogStatus>('draft');
  const [catalogDescription, setCatalogDescription] = useState('');
  const [catalogTerritories, setCatalogTerritories] = useState('US');
  const [catalogTags, setCatalogTags] = useState('');
  const [releaseItemId, setReleaseItemId] = useState('');
  const [releaseVersionKey, setReleaseVersionKey] = useState('');
  const [releaseVersionNumber, setReleaseVersionNumber] = useState('1');
  const [releaseLifecycleStatus, setReleaseLifecycleStatus] = useState<ManagedMediaProviderWritableReleaseStatus>('draft');
  const [releaseRightsPolicyId, setReleaseRightsPolicyId] = useState('');
  const [releaseSynopsis, setReleaseSynopsis] = useState('');
  const [releaseAssetKinds, setReleaseAssetKinds] = useState('source, poster, captions');
  const [deliveryKey, setDeliveryKey] = useState('');
  const [deliverySourceType, setDeliverySourceType] = useState<ManagedMediaAssetDeliverySourceType>('upload');
  const [deliveryPriority, setDeliveryPriority] = useState<ManagedMediaProviderRequestPriority>('normal');
  const [deliveryTitle, setDeliveryTitle] = useState('');
  const [deliveryDescription, setDeliveryDescription] = useState('');
  const [deliverySourceUri, setDeliverySourceUri] = useState('');
  const [deliveryAssetKinds, setDeliveryAssetKinds] = useState('source, poster, captions');
  const [deliveryExpectedFiles, setDeliveryExpectedFiles] = useState('');
  const [deliveryItemId, setDeliveryItemId] = useState('');
  const [deliveryReleaseVersionId, setDeliveryReleaseVersionId] = useState('');
  const [rightsPolicyKey, setRightsPolicyKey] = useState('');
  const [rightsVersion, setRightsVersion] = useState('v1');
  const [rightsMediaType, setRightsMediaType] = useState<ManagedMediaType>('video');
  const [rightsContractReference, setRightsContractReference] = useState('');
  const [rightsTerritories, setRightsTerritories] = useState('US');
  const [rightsRequiredPlans, setRightsRequiredPlans] = useState('managed-media');
  const [rightsAllowedActions, setRightsAllowedActions] = useState('preview');
  const [rightsEffectiveAt, setRightsEffectiveAt] = useState('');
  const [rightsExpiresAt, setRightsExpiresAt] = useState('');
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const managedMediaOrigin = overview?.managedMediaRuntime?.publicOrigin ?? fallbackMediaOrigin;
  const managedMediaAvailable = Boolean(overview?.access.managedMediaEntitled && overview?.managedMediaRuntime);
  const operatingMode = overview?.platform.managedMediaOperatingMode ?? 'normal';
  const {
    data: cloudDiscovery,
    error: cloudDiscoveryError,
    isLoading: isCloudDiscoveryLoading,
  } = useQuery({
    queryKey: ['managed-media-discovery', selectedType, query],
    queryFn: async () => {
      const discoveryRequest: ManagedMediaDiscoveryRequest = {
        mediaTypes: selectedType === 'all' ? undefined : [selectedType],
        query: query.trim() || undefined,
        limit: 100,
      };
      return invokeCloudFunction<ManagedMediaDiscoveryResponse>(
        'list-managed-media-discovery',
        {
          body: discoveryRequest,
        },
      );
    },
    enabled: Boolean(overview),
  });
  const discoverySourceItems =
    cloudDiscovery?.discoveryItems && cloudDiscovery.discoveryItems.length > 0
      ? cloudDiscovery.discoveryItems
      : managedMediaFixtureItems;
  const usingCloudDiscovery = discoverySourceItems === cloudDiscovery?.discoveryItems;
  const discoveryItems = filterManagedDiscoveryItems(discoverySourceItems, {
    audience: 'signed-in',
    query,
    mediaTypes: selectedType === 'all' ? undefined : [selectedType],
  });
  const selectedDiscoveryItem =
    selectedDiscoveryItemId
      ? discoveryItems.find((item) => item.id === selectedDiscoveryItemId) ?? null
      : null;
  const {
    data: selectedCatalogItemDetail,
    error: selectedCatalogItemDetailError,
    isLoading: isSelectedCatalogItemDetailLoading,
  } = useQuery({
    queryKey: [
      'managed-media-catalog-item-detail',
      selectedDiscoveryItem?.id,
      selectedDiscoveryItem?.playback?.releaseVersionId,
    ],
    queryFn: async () => {
      if (!selectedDiscoveryItem) {
        throw new Error('Select a managed media item before loading details.');
      }
      const detailRequest: ManagedMediaCatalogItemDetailRequest = {
        itemId: selectedDiscoveryItem.id,
        releaseVersionId: selectedDiscoveryItem.playback?.releaseVersionId,
        country: selectedDiscoveryItem.playback?.country,
      };
      return invokeCloudFunction<ManagedMediaCatalogItemDetailResponse>(
        'get-managed-media-catalog-item',
        {
          body: detailRequest,
        },
      );
    },
    enabled: Boolean(selectedDiscoveryItem && usingCloudDiscovery),
	  });
	  const selectedDetailItem = selectedCatalogItemDetail?.item ?? selectedDiscoveryItem;
  const selectedCatalogDetailFacts = selectedDetailItem
    ? catalogDetailFacts(selectedDetailItem.mediaType, selectedDetailItem.catalogDetails)
    : [];
	  const {
    data: providerWorkspaces = [],
    error: providerWorkspaceError,
    isLoading: isProviderWorkspacesLoading,
  } = useQuery({
    queryKey: ['managed-media-provider-workspaces'],
    queryFn: async () => {
      const data = await invokeCloudFunction<ManagedMediaProviderWorkspacesResponse>(
        'list-my-managed-media-provider-workspaces',
      );
      return data?.workspaces ?? [];
    },
    enabled: Boolean(overview),
  });
  const selectedProviderWorkspace =
    providerWorkspaces.find((workspace) => workspace.provider.id === selectedProviderId) ?? providerWorkspaces[0] ?? null;
  const providerReportingSummary = selectedProviderWorkspace?.reportingSummary ?? null;
  const selectedProviderUnitLabel = selectedProviderWorkspace
    ? providerUnitKindLabels[selectedProviderWorkspace.provider.providerUnitKind ?? 'root'] ?? 'Provider unit'
    : null;
  const selectedProviderHierarchyDepth = selectedProviderWorkspace?.provider.hierarchy?.depth ?? 0;
  const providerReportingTopMediaType = providerReportingSummary
    ? Object.entries(providerReportingSummary.byMediaType).sort(([, leftCount], [, rightCount]) => rightCount - leftCount)[0]
    : undefined;
  const providerReportingTopStatus = providerReportingSummary
    ? Object.entries(providerReportingSummary.byStatus).sort(([, leftCount], [, rightCount]) => rightCount - leftCount)[0]
    : undefined;
  const accountManagedMediaSummary = overview?.managedMediaSummary ?? null;
	  const providerContractTerms = selectedProviderWorkspace?.contractTerms ?? [];
	  const activeProviderContractTerms = providerContractTerms.filter((term) => term.status === 'active').length;
	  const providerSettlementStatements = selectedProviderWorkspace?.settlementStatements ?? [];
	  const providerCatalogItems = selectedProviderWorkspace?.catalogItems ?? [];
  const providerReleaseVersions = selectedProviderWorkspace?.releaseVersions ?? [];
  const selectedReleaseItem = providerCatalogItems.find((item) => item.id === releaseItemId) ?? providerCatalogItems[0] ?? null;
  const releaseVersionNumberValue = Number.parseInt(releaseVersionNumber, 10);
  const selectedRequestReleaseVersion =
    providerReleaseVersions.find((release) => release.id === requestReleaseVersionId) ?? null;
  const selectedRequestItem =
    providerCatalogItems.find((item) => item.id === (selectedRequestReleaseVersion?.itemId ?? requestItemId)) ?? null;
  const requestReleaseOptions = providerReleaseVersions.filter(
    (release) => !selectedRequestItem || release.itemId === selectedRequestItem.id,
  );
  const selectedDeliveryReleaseVersion =
    providerReleaseVersions.find((release) => release.id === deliveryReleaseVersionId) ?? null;
  const selectedDeliveryItem =
    providerCatalogItems.find((item) => item.id === (selectedDeliveryReleaseVersion?.itemId ?? deliveryItemId)) ?? null;
  const deliveryReleaseOptions = providerReleaseVersions.filter(
    (release) => !selectedDeliveryItem || release.itemId === selectedDeliveryItem.id,
  );
  const providerRequestCapability = (() => {
    if (!selectedProviderWorkspace) return false;
    const capabilities = new Set(selectedProviderWorkspace.membership.capabilities);
    if (requestType === 'support') return capabilities.has('provider:read');
    if (requestType === 'issue_response') return capabilities.has('issues:respond');
    if (requestType === 'rights_review' || requestType === 'takedown' || requestType === 'rollback') {
      return capabilities.has('rights:write');
    }
    return capabilities.has('catalog:write');
  })();
  const providerCatalogCapability = selectedProviderWorkspace
    ? selectedProviderWorkspace.membership.capabilities.includes('catalog:write')
    : false;
  const providerAssetDeliveryCapability = providerCatalogCapability;
  const providerRightsCapability = selectedProviderWorkspace
    ? selectedProviderWorkspace.membership.capabilities.includes('rights:write')
    : false;

  const submitProviderRequest = useMutation({
    mutationFn: async (payload: ManagedMediaProviderRequestSubmitRequest) => {
      return invokeCloudFunction('submit-my-managed-media-provider-request', {
        body: payload,
      });
    },
    onSuccess: async () => {
      setProviderMessage('Request submitted to OmniLux operators.');
      setRequestTitle('');
      setRequestMessage('');
      setRequestItemId('');
      setRequestReleaseVersionId('');
      setRequestRightsPolicyId('');
      await queryClient.invalidateQueries({ queryKey: ['managed-media-provider-workspaces'] });
    },
    onError: (mutationError) => {
      setProviderMessage(mutationError instanceof Error ? mutationError.message : 'Provider request could not be submitted.');
    },
  });
  const submitCatalogItem = useMutation({
    mutationFn: async (payload: ManagedMediaProviderCatalogItemUpsertRequest) => {
      return invokeCloudFunction<ManagedMediaProviderCatalogItemResponse>(
        'upsert-my-managed-media-catalog-item',
        { body: payload },
      );
    },
    onSuccess: async (result) => {
      setProviderMessage(`Catalog draft saved: ${result?.item.title ?? catalogTitle.trim()}.`);
      setCatalogExternalKey('');
      setCatalogTitle('');
      setCatalogDescription('');
      setCatalogTags('');
      await queryClient.invalidateQueries({ queryKey: ['managed-media-provider-workspaces'] });
    },
    onError: (mutationError) => {
      setProviderMessage(mutationError instanceof Error ? mutationError.message : 'Catalog draft could not be saved.');
    },
  });
  const submitReleaseVersion = useMutation({
    mutationFn: async (payload: ManagedMediaProviderReleaseVersionUpsertRequest) => {
      return invokeCloudFunction<ManagedMediaProviderReleaseVersionResponse>(
        'upsert-my-managed-media-release-version',
        { body: payload },
      );
    },
    onSuccess: async (result) => {
      setProviderMessage(`Release draft saved: ${result?.releaseVersion.releaseVersionKey ?? releaseVersionKey.trim()}.`);
      setReleaseVersionKey('');
      setReleaseVersionNumber('1');
      setReleaseSynopsis('');
      setReleaseAssetKinds('source, poster, captions');
      await queryClient.invalidateQueries({ queryKey: ['managed-media-provider-workspaces'] });
    },
    onError: (mutationError) => {
      setProviderMessage(mutationError instanceof Error ? mutationError.message : 'Release draft could not be saved.');
    },
  });
  const submitAssetDelivery = useMutation({
    mutationFn: async (payload: ManagedMediaProviderAssetDeliverySubmitRequest) => {
      return invokeCloudFunction<ManagedMediaProviderAssetDeliveryResponse>(
        'submit-my-managed-media-asset-delivery',
        { body: payload },
      );
    },
    onSuccess: async (result) => {
      setProviderMessage(`Asset delivery submitted: ${result?.assetDelivery.title ?? deliveryTitle.trim()}.`);
      setDeliveryKey('');
      setDeliveryTitle('');
      setDeliveryDescription('');
      setDeliverySourceUri('');
      setDeliveryExpectedFiles('');
      setDeliveryItemId('');
      setDeliveryReleaseVersionId('');
      await queryClient.invalidateQueries({ queryKey: ['managed-media-provider-workspaces'] });
    },
    onError: (mutationError) => {
      setProviderMessage(mutationError instanceof Error ? mutationError.message : 'Asset delivery could not be submitted.');
    },
  });
  const submitRightsPolicy = useMutation({
    mutationFn: async (payload: ManagedMediaProviderRightsPolicyUpsertRequest) => {
      return invokeCloudFunction<ManagedMediaProviderRightsPolicyResponse>(
        'upsert-my-managed-media-rights-policy',
        { body: payload },
      );
    },
    onSuccess: async (result) => {
      setProviderMessage(`Rights policy draft saved: ${result?.rightsPolicy.policyKey ?? rightsPolicyKey.trim()}.`);
      setRightsPolicyKey('');
      setRightsContractReference('');
      await queryClient.invalidateQueries({ queryKey: ['managed-media-provider-workspaces'] });
    },
    onError: (mutationError) => {
      setProviderMessage(mutationError instanceof Error ? mutationError.message : 'Rights policy draft could not be saved.');
    },
  });
  const exportProviderReport = useMutation({
    mutationFn: async (payload: {
      providerId: string;
      windowStart: string;
      windowEnd: string;
      reportType: ManagedMediaProviderReportExportType;
    }) => {
      const data = await invokeCloudFunction<ManagedMediaProviderReportExportResponse>(
        'export-my-managed-media-provider-report',
        {
          body: {
            providerId: payload.providerId,
            windowStart: payload.windowStart,
            windowEnd: payload.windowEnd,
            format: 'csv',
            reportType: payload.reportType,
            source: 'provider-dashboard',
          },
        },
      );
      if (!data?.csv) {
        throw new Error('Provider report export did not include CSV content.');
      }
      return data;
    },
    onSuccess: (result) => {
      const safeProviderId = result.providerId.replace(/[^a-zA-Z0-9_-]/g, '-');
      const dateStamp = result.generatedAt.slice(0, 10);
      const reportLabel = result.reportType === 'settlement-basis' ? 'settlement-basis' : 'item-aggregate';
      downloadTextFile(
        `managed-media-${safeProviderId}-${reportLabel}-${dateStamp}.csv`,
        result.csv ?? '',
        'text/csv;charset=utf-8',
      );
      setProviderMessage(
        result.reportType === 'settlement-basis'
          ? `Settlement basis exported with ${numberFormatter.format(result.rows.length)} aggregate rows.`
          : `Provider report exported with ${numberFormatter.format(result.rows.length)} item rows.`,
      );
    },
    onError: (mutationError) => {
      setProviderMessage(mutationError instanceof Error ? mutationError.message : 'Provider report could not be exported.');
    },
  });

  const openManagedMedia = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const destination = await establishManagedMediaSession({
        mediaOrigin: managedMediaOrigin,
        getAccessToken,
      });
      window.location.assign(destination);
    } catch (caughtError) {
      setLaunchError(
        caughtError instanceof Error
          ? caughtError.message
          : 'OmniLux Media could not start a session for this account.',
      );
    } finally {
      setLaunching(false);
    }
  };
  const launchDiscoveryItem = async (item: ManagedDiscoveryItem) => {
    if (!item.playback) {
      setLaunchError('This managed media item does not have a playback target yet.');
      return;
    }

    setPlaybackLaunchItemId(item.id);
    setLaunchError(null);
    try {
      const action = item.playback.action ?? 'play';
      const grantRequest: ManagedMediaPlaybackGrantIssueRequest = usingCloudDiscovery
        ? {
          action,
          media: {
            releaseVersionId: item.playback.releaseVersionId,
            assetId: item.playback.assetId,
          },
          country: item.playback.country,
          session: item.playback.session,
        }
        : {
          action,
          media: {
            itemId: item.id,
            mediaType: item.mediaType,
            providerId: item.provider.id,
            releaseVersionId: item.playback.releaseVersionId,
            assetId: item.playback.assetId,
          },
          preview: item.preview,
          availability: item.availability,
          entitlement: item.entitlement,
          policy: item.policy,
          country: item.playback.country,
          session: item.playback.session,
        };
      const result = await launchManagedMediaPlayback({
        mediaOrigin: managedMediaOrigin,
        getAccessToken,
        grantRequest,
      });
      await consumeManagedMediaPlaybackGrant({
        grantId: result.launch.grant.grantId,
        source: 'app.omnilux.tv',
        metadata: {
          launchSurface: 'managed-media-dashboard',
          itemId: result.launch.itemId,
          assetId: result.launch.assetId,
          releaseVersionId: result.launch.releaseVersionId,
          correlationId: result.launch.grant.audit.correlationId,
        },
      }).catch((consumeError) => {
        console.warn('Managed media playback grant could not be marked consumed.', consumeError);
      });
      await recordManagedMediaUsageEvent({
        mediaOrigin: managedMediaOrigin,
        getAccessToken,
        event: {
          eventType: 'play-start',
          itemId: result.launch.itemId,
          assetId: result.launch.assetId,
          mediaType: result.launch.mediaType,
          providerId: result.launch.providerId,
          grantId: result.launch.grant.grantId,
          occurredAt: new Date().toISOString(),
          region: item.playback.country ? { ipCountry: item.playback.country } : undefined,
          device: {
            deviceType: 'browser',
            surface: 'app.omnilux.tv',
          },
          policy: {
            allowedActions: result.launch.grant.allowedActions,
            allowedRenditions: result.launch.grant.allowedRenditions,
            deliveryPolicyId: result.launch.asset.deliveryPolicyId,
            protectionPolicyId: result.launch.asset.protectionPolicyId,
          },
          metadata: {
            launchSurface: 'managed-media-dashboard',
            releaseVersionId: result.launch.releaseVersionId,
            correlationId: result.launch.grant.audit.correlationId,
          },
        },
      }).catch((usageError) => {
        console.warn('Managed media usage event could not be recorded.', usageError);
      });
      window.location.assign(new URL(result.launch.stream.directFileUrl, managedMediaOrigin).toString());
    } catch (caughtError) {
      setLaunchError(
        caughtError instanceof Error
          ? caughtError.message
          : 'OmniLux Media could not prepare playback for this item.',
      );
    } finally {
      setPlaybackLaunchItemId(null);
    }
  };

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-medium text-muted">Managed media</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">OmniLux Media</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Browse partner and studio media previews, then open playback only when your account, plan, region, and
            rights policy allow it. Managed media stays separate from the private libraries on your self-hosted server.
          </p>
        </div>

        {overview && (operatingMode !== 'normal' || overview.platform.managedMediaIncidentMessage) ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
            <p className="text-xs font-semibold text-warning">Service status</p>
            <p className="mt-2 text-lg font-semibold">{overview.platform.managedMediaOperatingModeLabel}</p>
            <p className="mt-2 text-muted">
              {overview.platform.managedMediaIncidentMessage || 'OmniLux has published a service notice for managed media.'}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-foreground">
            {error instanceof Error ? error.message : 'Managed media status could not be loaded.'}
          </div>
        ) : null}

        {launchError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-foreground">
            {launchError}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-xl surface-soft p-6">
            <div className="flex items-center gap-3">
              <RadioTower className="h-6 w-6 text-accent" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Access for this account</h2>
                <p className="text-sm text-muted">
                  {isLoading
                    ? 'Checking managed media status for this account.'
                    : managedMediaAvailable
                    ? 'This account can open OmniLux Media right now.'
                    : 'Managed media is not currently available to this account.'}
                </p>
              </div>
            </div>

            {isLoading && !overview ? (
              <div className="mt-4 space-y-3">
                <div className="h-5 animate-pulse rounded bg-surface" />
                <div className="h-5 animate-pulse rounded bg-surface" />
                <div className="h-5 animate-pulse rounded bg-surface" />
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {[
                  overview?.access.managedMediaEntitled
                    ? 'Managed media access is active on this cloud account.'
                    : 'Managed media access is currently unavailable for this cloud account.',
                  overview?.platform.managedMediaPolicyDescription ??
                    'Managed media follows the current OmniLux Cloud platform policy.',
                  'Managed media stays separate from self-hosted ownership, invites, and local server accounts.',
                ].map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {managedMediaAvailable ? (
                <button
                  type="button"
                  onClick={() => {
                    void openManagedMedia();
                  }}
                  disabled={launching}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  {launching ? 'Opening...' : 'Open OmniLux Media'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted">
                  <ExternalLink className="h-4 w-4" />
                  Access restricted
                </span>
              )}
              <a
                href={buildDocsHref('/guide/managed-media')}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <Sparkles className="h-4 w-4" />
                Read the guide
              </a>
            </div>

            {accountManagedMediaSummary ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-xs font-semibold text-muted">Discovery</p>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {numberFormatter.format(accountManagedMediaSummary.discoveryItemsTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-xs font-semibold text-muted">Playable</p>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {numberFormatter.format(accountManagedMediaSummary.playableItemsTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-xs font-semibold text-muted">Provider</p>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {numberFormatter.format(accountManagedMediaSummary.providerWorkspacesTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-xs font-semibold text-muted">Issued</p>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {numberFormatter.format(accountManagedMediaSummary.recentGrantsIssued)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-xs font-semibold text-muted">Consumed</p>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {numberFormatter.format(accountManagedMediaSummary.recentGrantsConsumed)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-background p-6">
            <h2 className="font-semibold text-foreground">Service status</h2>
            {isLoading && !overview ? (
              <div className="mt-4 space-y-3">
                <div className="h-5 animate-pulse rounded bg-surface" />
                <div className="h-5 animate-pulse rounded bg-surface" />
                <div className="h-5 animate-pulse rounded bg-surface" />
                <div className="h-5 animate-pulse rounded bg-surface" />
              </div>
            ) : overview?.managedMediaRuntime ? (
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-muted">Origin</dt>
                  <dd className="mt-1 text-foreground">{managedMediaOrigin}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Relay state</dt>
                  <dd className="mt-1 text-foreground">
                    {overview.managedMediaRuntime.relayCondition
                      ? getRelayConditionLabel(overview.managedMediaRuntime.relayCondition)
                      : overview.managedMediaRuntime.relayStatus ?? 'Unknown'}
                  </dd>
                  {overview.managedMediaRuntime.relayConditionDetail?.summary && (
                    <dd className="mt-1 text-xs text-muted">
                      {overview.managedMediaRuntime.relayConditionDetail.summary}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Version</dt>
                  <dd className="mt-1 text-foreground">{overview.managedMediaRuntime.version ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Last seen</dt>
                  <dd className="mt-1 text-foreground">
                    {overview.managedMediaRuntime.lastSeenAt
                      ? new Date(overview.managedMediaRuntime.lastSeenAt).toLocaleString()
                      : 'No heartbeat recorded'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted">
                OmniLux Media is not reporting status to OmniLux Cloud yet.
              </p>
            )}
          </div>
        </div>

        <section className="rounded-xl border border-border bg-background p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-accent">Discovery preview</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">Partner and studio catalog</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Signed-in catalog entries use OmniLux Cloud release state when available, with safe fixture previews
                reserved for empty early environments.
              </p>
              {cloudDiscovery?.result ? (
                <p className="mt-2 text-xs text-muted">
                  {numberFormatter.format(cloudDiscovery.result.returned)} of{' '}
                  {numberFormatter.format(cloudDiscovery.result.totalMatched)} matching cloud items
                  {cloudDiscovery.result.capped ? ' shown' : ''}.
                </p>
              ) : null}
            </div>
            <label className="relative block w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search previews"
                className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent"
              />
            </label>
          </div>

          {isCloudDiscoveryLoading || cloudDiscoveryError ? (
            <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              {isCloudDiscoveryLoading
                ? 'Loading managed-media catalog...'
                : 'Cloud catalog is unavailable, so fixture previews are shown.'}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedType === 'all'
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-surface text-muted hover:text-foreground'
              }`}
            >
              All
            </button>
            {mediaTypeOptions.map((mediaType) => (
              <button
                key={mediaType}
                type="button"
                onClick={() => setSelectedType(mediaType)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedType === mediaType
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-surface text-muted hover:text-foreground'
                }`}
              >
                {managedMediaTypeLabels[mediaType]}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {discoveryItems.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    {managedMediaTypeLabels[item.mediaType]}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
                    {item.provider.displayName}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
                    {item.availability.territories.join(', ')}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                {item.subtitle ? <p className="mt-1 text-sm font-medium text-accent">{item.subtitle}</p> : null}
                <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
                <div className="mt-4 rounded-lg bg-background/70 p-4">
                  <div className="flex items-start gap-3">
                    {item.entitlement.playbackAllowed ? (
                      <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.availability.status === 'playable' ? 'Playable' : item.availability.status}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">{item.entitlement.message}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDiscoveryItemId(item.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                  >
                    <Search className="h-4 w-4" />
                    {selectedDiscoveryItemId === item.id ? 'Details shown' : 'View details'}
                  </button>
                  {item.entitlement.playbackAllowed && item.playback ? (
                    <button
                      type="button"
                      onClick={() => {
                        void launchDiscoveryItem(item);
                      }}
                      disabled={playbackLaunchItemId === item.id}
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {playbackLaunchItemId === item.id ? 'Preparing...' : 'Launch playback'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {selectedDetailItem ? (
            <article className="mt-6 rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold text-accent">Catalog detail</p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{selectedDetailItem.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{selectedDetailItem.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDiscoveryItemId(null)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>

              {isSelectedCatalogItemDetailLoading ? (
                <p className="mt-4 text-sm text-muted">Loading cloud catalog detail...</p>
              ) : selectedCatalogItemDetailError ? (
                <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                  Cloud catalog detail is unavailable, so the discovery summary is shown.
                </p>
              ) : null}

	              <dl className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <dt className="text-xs font-semibold text-muted">Provider</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{selectedDetailItem.provider.displayName}</dd>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <dt className="text-xs font-semibold text-muted">Status</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{selectedDetailItem.availability.status}</dd>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <dt className="text-xs font-semibold text-muted">Release</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {selectedCatalogItemDetail?.release.releaseVersionKey ?? selectedDetailItem.playback?.releaseVersionId ?? 'Preview'}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <dt className="text-xs font-semibold text-muted">Policy</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {selectedCatalogItemDetail?.policy.decision ?? (selectedDetailItem.entitlement.playbackAllowed ? 'allow' : 'preview-only')}
                  </dd>
	                </div>
	              </dl>

              {selectedCatalogDetailFacts.length > 0 ? (
                <dl className="mt-4 grid gap-3 md:grid-cols-3">
                  {selectedCatalogDetailFacts.map((fact) => (
                    <div key={`${fact.label}-${fact.value}`} className="rounded-lg border border-border bg-background/70 p-3">
                      <dt className="text-xs font-semibold text-muted">{fact.label}</dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-foreground">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

	              <div className="mt-4 rounded-lg bg-background/70 p-4">
                <p className="text-sm font-semibold text-foreground">{selectedDetailItem.entitlement.message}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Territories: {selectedDetailItem.availability.territories.length > 0
                    ? selectedDetailItem.availability.territories.join(', ')
                    : 'Policy controlled'}.
                  {selectedDetailItem.availability.rating ? ` Rating: ${selectedDetailItem.availability.rating}.` : ''}
                </p>
              </div>
            </article>
          ) : null}

          {discoveryItems.length === 0 ? (
            <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              No managed-media previews match this filter.
            </p>
          ) : null}
        </section>

        {providerWorkspaces.length > 0 || isProviderWorkspacesLoading || providerWorkspaceError ? (
          <section className="rounded-xl border border-border bg-background p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold text-accent">Provider workspace</p>
                <h2 className="mt-2 text-xl font-bold text-foreground">Media partner workspace</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Submit scoped catalog drafts, rights policy drafts, and operator requests for your provider account.
                </p>
              </div>
              {selectedProviderWorkspace ? (
                <span className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted">
                  {selectedProviderWorkspace.membership.role}
                </span>
              ) : null}
            </div>

            {providerWorkspaceError ? (
              <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                {providerWorkspaceError instanceof Error
                  ? providerWorkspaceError.message
                  : 'Provider workspace could not be loaded.'}
              </div>
            ) : null}

            {providerMessage ? (
              <div className="mt-5 rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm text-foreground">
                {providerMessage}
              </div>
            ) : null}

            {isProviderWorkspacesLoading ? (
              <div className="mt-5 space-y-3">
                <div className="h-12 animate-pulse rounded-lg bg-surface" />
                <div className="h-12 animate-pulse rounded-lg bg-surface" />
              </div>
            ) : selectedProviderWorkspace ? (
              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Provider</span>
                  <select
                    value={selectedProviderWorkspace.provider.id}
                    onChange={(event) => setSelectedProviderId(event.currentTarget.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                  >
                    {providerWorkspaces.map((workspace) => (
                      <option key={workspace.provider.id} value={workspace.provider.id}>
                        {workspace.provider.displayName}
                      </option>
                    ))}
                  </select>
                  {selectedProviderUnitLabel ? (
                    <span className="mt-2 block text-xs text-muted">
                      {selectedProviderUnitLabel}
                      {selectedProviderHierarchyDepth > 0
                        ? ` - ${selectedProviderHierarchyDepth} level${selectedProviderHierarchyDepth === 1 ? '' : 's'} below root`
                        : ''}
                    </span>
                  ) : null}
                </label>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold text-muted">Contract terms</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{numberFormatter.format(providerContractTerms.length)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {numberFormatter.format(activeProviderContractTerms)} active operational term{activeProviderContractTerms === 1 ? '' : 's'}
                  </p>
                </div>

                {providerReportingSummary ? (
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted">Provider reporting</p>
                        <h3 className="mt-1 font-semibold text-foreground">30-day playback grants</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
                          {reportingDateFormatter.format(new Date(providerReportingSummary.windowStart))} -{' '}
                          {reportingDateFormatter.format(new Date(providerReportingSummary.windowEnd))}
                        </span>
	                        <button
	                          type="button"
	                          disabled={exportProviderReport.isPending}
	                          onClick={() => {
	                            exportProviderReport.mutate({
	                              providerId: selectedProviderWorkspace.provider.id,
	                              windowStart: providerReportingSummary.windowStart,
	                              windowEnd: providerReportingSummary.windowEnd,
	                              reportType: 'item-aggregate',
	                            });
	                          }}
	                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
	                        >
	                          <Download className="size-3.5" aria-hidden="true" />
	                          {exportProviderReport.isPending ? 'Exporting' : 'CSV'}
	                        </button>
	                        <button
	                          type="button"
	                          disabled={exportProviderReport.isPending}
	                          onClick={() => {
	                            exportProviderReport.mutate({
	                              providerId: selectedProviderWorkspace.provider.id,
	                              windowStart: providerReportingSummary.windowStart,
	                              windowEnd: providerReportingSummary.windowEnd,
	                              reportType: 'settlement-basis',
	                            });
	                          }}
	                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
	                        >
	                          <Download className="size-3.5" aria-hidden="true" />
	                          Settlement CSV
	                        </button>
	                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-5">
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs font-semibold text-muted">Issued</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                          {numberFormatter.format(providerReportingSummary.grantsIssued)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs font-semibold text-muted">Consumed</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                          {numberFormatter.format(providerReportingSummary.grantsConsumed)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs font-semibold text-muted">Accounts</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                          {numberFormatter.format(providerReportingSummary.uniqueAccounts)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs font-semibold text-muted">Top media</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {providerReportingTopMediaType
                            ? `${managedMediaTypeLabels[providerReportingTopMediaType[0] as ManagedMediaType]} (${numberFormatter.format(
                              providerReportingTopMediaType[1],
                            )})`
                            : 'No activity'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs font-semibold text-muted">Top status</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {providerReportingTopStatus
                            ? `${requestStatusLabel(providerReportingTopStatus[0])} (${numberFormatter.format(
                              providerReportingTopStatus[1],
                            )})`
                            : 'No activity'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-semibold text-muted">Top items</p>
                      {providerReportingSummary.topItems.length === 0 ? (
                        <p className="mt-3 text-sm leading-6 text-muted">No grant activity has been recorded in this window.</p>
                      ) : (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {providerReportingSummary.topItems.map((item) => (
                            <article key={item.itemId} className="rounded-lg border border-border bg-background/70 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                  {managedMediaTypeLabels[item.mediaType]}
                                </span>
                                <span className="text-xs font-semibold text-muted">
                                  {numberFormatter.format(item.grantsConsumed)} / {numberFormatter.format(item.grantsIssued)}
                                </span>
                              </div>
                              <h4 className="mt-2 truncate text-sm font-semibold text-foreground">
                                {item.title ?? item.itemId}
                              </h4>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
	                  </div>
	                ) : null}

	                {providerSettlementStatements.length > 0 ? (
	                  <div className="rounded-xl border border-border bg-surface p-4">
	                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
	                      <div>
	                        <p className="text-xs font-semibold text-muted">Settlement statements</p>
	                        <h3 className="mt-1 font-semibold text-foreground">Operator-approved aggregate statements</h3>
	                      </div>
	                      <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
	                        {numberFormatter.format(providerSettlementStatements.length)} statement{providerSettlementStatements.length === 1 ? '' : 's'}
	                      </span>
	                    </div>

	                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
	                      {providerSettlementStatements.slice(0, 4).map((statement) => {
	                        const grantsConsumed =
	                          typeof statement.summary.grantsConsumed === 'number' ? statement.summary.grantsConsumed : 0;
	                        return (
	                          <article key={statement.id} className="rounded-lg border border-border bg-background/70 p-3">
	                            <div className="flex items-start justify-between gap-3">
	                              <div className="min-w-0">
	                                <p className="truncate font-mono text-xs font-semibold text-foreground">
	                                  {statement.statementKey}
	                                </p>
	                                <p className="mt-1 text-xs text-muted">
	                                  {statement.statementPeriod} · {requestStatusLabel(statement.status)}
	                                </p>
	                              </div>
	                              <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
	                                {numberFormatter.format(grantsConsumed)} consumed
	                              </span>
	                            </div>
	                            <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
	                              <span>
	                                Window {reportingDateFormatter.format(new Date(statement.windowStart))} -{' '}
	                                {reportingDateFormatter.format(new Date(statement.windowEnd))}
	                              </span>
	                              <span>
	                                {numberFormatter.format(statement.rows.length)} aggregate row{statement.rows.length === 1 ? '' : 's'}
	                              </span>
	                            </div>
	                            <p className="mt-3 text-xs leading-5 text-muted">
	                              No account-level rows, financial amounts, or payout instructions are included.
	                            </p>
	                          </article>
	                        );
	                      })}
	                    </div>
	                  </div>
	                ) : null}

	                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted">Catalog draft</p>
                        <h3 className="mt-1 font-semibold text-foreground">Submit media metadata</h3>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
                        {selectedProviderWorkspace.catalogItems.length} items
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Title</span>
                        <input
                          value={catalogTitle}
                          onChange={(event) => setCatalogTitle(event.currentTarget.value)}
                          className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          placeholder="Release or working title"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Media type</span>
                          <select
                            value={catalogMediaType}
                            onChange={(event) => setCatalogMediaType(event.currentTarget.value as ManagedMediaType)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            {mediaTypeOptions.map((mediaType) => (
                              <option key={mediaType} value={mediaType}>
                                {managedMediaTypeLabels[mediaType]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Status</span>
                          <select
                            value={catalogLifecycleStatus}
                            onChange={(event) =>
                              setCatalogLifecycleStatus(event.currentTarget.value as ManagedMediaProviderWritableCatalogStatus)
                            }
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            {providerCatalogStatuses.map((status) => (
                              <option key={status} value={status}>
                                {requestStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Provider key</span>
                        <input
                          value={catalogExternalKey}
                          onChange={(event) => setCatalogExternalKey(event.currentTarget.value)}
                          className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          placeholder="optional stable id"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Description</span>
                        <textarea
                          value={catalogDescription}
                          onChange={(event) => setCatalogDescription(event.currentTarget.value)}
                          rows={3}
                          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                          placeholder="Synopsis, editorial note, or catalog context"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Territories</span>
                          <input
                            value={catalogTerritories}
                            onChange={(event) => setCatalogTerritories(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="US, CA"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Tags</span>
                          <input
                            value={catalogTags}
                            onChange={(event) => setCatalogTags(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="documentary, preview"
                          />
                        </label>
                      </div>

                      {!providerCatalogCapability ? (
                        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                          This provider role cannot submit catalog drafts.
                        </p>
                      ) : null}

                      <button
                        type="button"
                        disabled={submitCatalogItem.isPending || !providerCatalogCapability || catalogTitle.trim().length < 3}
                        onClick={() => {
                          if (!selectedProviderWorkspace) return;
                          submitCatalogItem.mutate({
                            providerId: selectedProviderWorkspace.provider.id,
                            externalItemKey: catalogExternalKey.trim() || null,
                            mediaType: catalogMediaType,
                            title: catalogTitle.trim(),
                            lifecycleStatus: catalogLifecycleStatus,
                            metadata: {
                              description: catalogDescription.trim() || undefined,
                              territories: splitCommaList(catalogTerritories),
                              tags: splitCommaList(catalogTags),
                              submittedFrom: 'omnilux-app-provider-workspace',
                            },
                            source: 'provider-dashboard',
                          });
                        }}
                        className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitCatalogItem.isPending ? 'Saving...' : 'Save catalog draft'}
                      </button>
                    </div>

                    <div className="mt-5 border-t border-border pt-4">
                      <p className="text-xs font-semibold text-muted">Recent catalog items</p>
                      {selectedProviderWorkspace.catalogItems.length === 0 ? (
                        <p className="mt-3 text-sm leading-6 text-muted">No catalog drafts have been created for this provider.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {selectedProviderWorkspace.catalogItems.slice(0, 4).map((item) => (
                            <article key={item.id} className="rounded-lg border border-border bg-background/70 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                  {managedMediaTypeLabels[item.mediaType]}
                                </span>
                                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                  {requestStatusLabel(item.lifecycleStatus)}
                                </span>
                              </div>
                              <h4 className="mt-2 text-sm font-semibold text-foreground">{item.title}</h4>
                              {item.externalItemKey ? (
                                <p className="mt-1 font-mono text-[11px] text-muted">{item.externalItemKey}</p>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted">Rights draft</p>
                        <h3 className="mt-1 font-semibold text-foreground">Submit policy inputs</h3>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
                        {selectedProviderWorkspace.rightsPolicies.length} policies
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Policy key</span>
                          <input
                            value={rightsPolicyKey}
                            onChange={(event) => setRightsPolicyKey(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="studio-preview"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Version</span>
                          <input
                            value={rightsVersion}
                            onChange={(event) => setRightsVersion(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="v1"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Media type</span>
                          <select
                            value={rightsMediaType}
                            onChange={(event) => setRightsMediaType(event.currentTarget.value as ManagedMediaType)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            {mediaTypeOptions.map((mediaType) => (
                              <option key={mediaType} value={mediaType}>
                                {managedMediaTypeLabels[mediaType]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Contract ref</span>
                          <input
                            value={rightsContractReference}
                            onChange={(event) => setRightsContractReference(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="optional internal reference"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Territories</span>
                          <input
                            value={rightsTerritories}
                            onChange={(event) => setRightsTerritories(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="US, CA"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Required plans</span>
                          <input
                            value={rightsRequiredPlans}
                            onChange={(event) => setRightsRequiredPlans(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="managed-media"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Allowed actions</span>
                        <input
                          value={rightsAllowedActions}
                          onChange={(event) => setRightsAllowedActions(event.currentTarget.value)}
                          className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          placeholder="preview, play"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Effective</span>
                          <input
                            type="datetime-local"
                            value={rightsEffectiveAt}
                            onChange={(event) => setRightsEffectiveAt(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Expires</span>
                          <input
                            type="datetime-local"
                            value={rightsExpiresAt}
                            onChange={(event) => setRightsExpiresAt(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          />
                        </label>
                      </div>

                      {!providerRightsCapability ? (
                        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                          This provider role cannot submit rights drafts.
                        </p>
                      ) : null}

                      <button
                        type="button"
                        disabled={
                          submitRightsPolicy.isPending ||
                          !providerRightsCapability ||
                          rightsPolicyKey.trim().length < 3 ||
                          rightsVersion.trim().length < 1
                        }
                        onClick={() => {
                          if (!selectedProviderWorkspace) return;
                          const territories = splitCommaList(rightsTerritories);
                          const requiredPlans = splitCommaList(rightsRequiredPlans);
                          const allowedActions = splitCommaList(rightsAllowedActions);
                          submitRightsPolicy.mutate({
                            providerId: selectedProviderWorkspace.provider.id,
                            policyKey: rightsPolicyKey.trim(),
                            rightsVersion: rightsVersion.trim(),
                            mediaType: rightsMediaType,
                            contractReference: rightsContractReference.trim() || null,
                            visibilityRules: {
                              publicVisible: false,
                              signedInVisible: true,
                              territories,
                            },
                            playbackRules: {
                              allowedActions: allowedActions.length > 0 ? allowedActions : ['preview'],
                              requiredPlans,
                              territories,
                            },
                            deliveryRules: {
                              deliveryPolicyId: 'managed-media-default-delivery',
                              offlineAllowed: allowedActions.includes('offline-renew'),
                            },
                            reportingRules: {
                              usageEventsRequired: true,
                              aggregateProviderReports: true,
                            },
                            revenueRules: {
                              settlementRequired: false,
                            },
                            takedownRules: {
                              providerMayRequestTakedown: true,
                            },
                            effectiveAt: toIsoTimestamp(rightsEffectiveAt),
                            expiresAt: toIsoTimestamp(rightsExpiresAt) ?? null,
                            source: 'provider-dashboard',
                          });
                        }}
                        className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitRightsPolicy.isPending ? 'Saving...' : 'Save rights draft'}
                      </button>
                    </div>

                    <div className="mt-5 border-t border-border pt-4">
                      <p className="text-xs font-semibold text-muted">Recent rights policies</p>
                      {selectedProviderWorkspace.rightsPolicies.length === 0 ? (
                        <p className="mt-3 text-sm leading-6 text-muted">No rights drafts have been created for this provider.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {selectedProviderWorkspace.rightsPolicies.slice(0, 4).map((policy) => (
                            <article key={policy.id} className="rounded-lg border border-border bg-background/70 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                  {managedMediaTypeLabels[policy.mediaType]}
                                </span>
                                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                  {policy.status}
                                </span>
                              </div>
                              <h4 className="mt-2 text-sm font-semibold text-foreground">{policy.policyKey}</h4>
                              <p className="mt-1 text-xs text-muted">{policy.rightsVersion}</p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted">Release draft</p>
                      <h3 className="mt-1 font-semibold text-foreground">Bundle metadata for operator review</h3>
                    </div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
                      {providerReleaseVersions.length} releases
                    </span>
                  </div>

                  <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Catalog item</span>
                          <select
                            value={selectedReleaseItem?.id ?? ''}
                            onChange={(event) => setReleaseItemId(event.currentTarget.value)}
                            disabled={providerCatalogItems.length === 0}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {providerCatalogItems.length === 0 ? <option value="">Create a catalog draft first</option> : null}
                            {providerCatalogItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Status</span>
                          <select
                            value={releaseLifecycleStatus}
                            onChange={(event) =>
                              setReleaseLifecycleStatus(event.currentTarget.value as ManagedMediaProviderWritableReleaseStatus)
                            }
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            {providerReleaseStatuses.map((status) => (
                              <option key={status} value={status}>
                                {requestStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Release key</span>
                          <input
                            value={releaseVersionKey}
                            onChange={(event) => setReleaseVersionKey(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="fall-release-v1"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Version</span>
                          <input
                            type="number"
                            min={1}
                            value={releaseVersionNumber}
                            onChange={(event) => setReleaseVersionNumber(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="1"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Rights policy</span>
                        <select
                          value={releaseRightsPolicyId}
                          onChange={(event) => setReleaseRightsPolicyId(event.currentTarget.value)}
                          className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        >
                          <option value="">No policy link yet</option>
                          {selectedProviderWorkspace.rightsPolicies.map((policy) => (
                            <option key={policy.id} value={policy.id}>
                              {policy.policyKey} {policy.rightsVersion}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Asset kinds</span>
                          <input
                            value={releaseAssetKinds}
                            onChange={(event) => setReleaseAssetKinds(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="source, poster, captions"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Synopsis</span>
                          <input
                            value={releaseSynopsis}
                            onChange={(event) => setReleaseSynopsis(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="Release notes or synopsis"
                          />
                        </label>
                      </div>

                      {!providerCatalogCapability ? (
                        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                          This provider role cannot submit release drafts.
                        </p>
                      ) : null}

                      <button
                        type="button"
                        disabled={
                          submitReleaseVersion.isPending ||
                          !providerCatalogCapability ||
                          !selectedReleaseItem ||
                          releaseVersionKey.trim().length < 3 ||
                          !Number.isInteger(releaseVersionNumberValue) ||
                          releaseVersionNumberValue < 1
                        }
                        onClick={() => {
                          if (!selectedProviderWorkspace || !selectedReleaseItem) return;
                          submitReleaseVersion.mutate({
                            providerId: selectedProviderWorkspace.provider.id,
                            itemId: selectedReleaseItem.id,
                            releaseVersionKey: releaseVersionKey.trim(),
                            versionNumber: releaseVersionNumberValue,
                            lifecycleStatus: releaseLifecycleStatus,
                            rightsPolicyId: releaseRightsPolicyId || null,
                            metadataSnapshot: {
                              title: selectedReleaseItem.title,
                              mediaType: selectedReleaseItem.mediaType,
                              synopsis: releaseSynopsis.trim() || undefined,
                              submittedFrom: 'omnilux-app-provider-workspace',
                            },
                            assetsSnapshot: {
                              expectedAssetKinds: splitCommaList(releaseAssetKinds),
                              providerSubmitted: true,
                            },
                            source: 'provider-dashboard',
                          });
                        }}
                        className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitReleaseVersion.isPending ? 'Saving...' : 'Save release draft'}
                      </button>
                    </div>

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <p className="text-xs font-semibold text-muted">Recent release versions</p>
                      {providerReleaseVersions.length === 0 ? (
                        <p className="mt-3 text-sm leading-6 text-muted">
                          No release drafts have been created for this provider.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {providerReleaseVersions.slice(0, 5).map((release) => {
                            const releaseItem = providerCatalogItems.find((item) => item.id === release.itemId);
                            return (
                              <article key={release.id} className="rounded-lg border border-border bg-surface p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                    v{release.versionNumber}
                                  </span>
                                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                    {requestStatusLabel(release.lifecycleStatus)}
                                  </span>
                                </div>
                                <h4 className="mt-2 text-sm font-semibold text-foreground">
                                  {release.releaseVersionKey}
                                </h4>
                                <p className="mt-1 text-xs text-muted">{releaseItem?.title ?? release.itemId}</p>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted">Asset delivery</p>
                      <h3 className="mt-1 font-semibold text-foreground">Submit upload or feed intake</h3>
                    </div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
                      {selectedProviderWorkspace.assetDeliveries.length} deliveries
                    </span>
                  </div>

                  <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Delivery key</span>
                          <input
                            value={deliveryKey}
                            onChange={(event) => setDeliveryKey(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="fall-release-source-v1"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Source type</span>
                          <select
                            value={deliverySourceType}
                            onChange={(event) => setDeliverySourceType(event.currentTarget.value as ManagedMediaAssetDeliverySourceType)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            {providerAssetDeliverySourceTypes.map((sourceType) => (
                              <option key={sourceType} value={sourceType}>
                                {providerAssetDeliverySourceLabels[sourceType]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Title</span>
                          <input
                            value={deliveryTitle}
                            onChange={(event) => setDeliveryTitle(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="Main feature source package"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Priority</span>
                          <select
                            value={deliveryPriority}
                            onChange={(event) => setDeliveryPriority(event.currentTarget.value as ManagedMediaProviderRequestPriority)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            {providerRequestPriorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Catalog item</span>
                          <select
                            value={selectedDeliveryItem?.id ?? ''}
                            onChange={(event) => {
                              const nextItemId = event.currentTarget.value;
                              setDeliveryItemId(nextItemId);
                              if (
                                deliveryReleaseVersionId &&
                                providerReleaseVersions.find((release) => release.id === deliveryReleaseVersionId)?.itemId !== nextItemId
                              ) {
                                setDeliveryReleaseVersionId('');
                              }
                            }}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            <option value="">Unlinked intake</option>
                            {providerCatalogItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Release version</span>
                          <select
                            value={selectedDeliveryReleaseVersion?.id ?? ''}
                            onChange={(event) => {
                              const nextReleaseId = event.currentTarget.value;
                              const nextRelease = providerReleaseVersions.find((release) => release.id === nextReleaseId);
                              setDeliveryReleaseVersionId(nextReleaseId);
                              setDeliveryItemId(nextRelease?.itemId ?? deliveryItemId);
                            }}
                            disabled={deliveryReleaseOptions.length === 0}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">No release link</option>
                            {deliveryReleaseOptions.map((release) => (
                              <option key={release.id} value={release.id}>
                                {release.releaseVersionKey} v{release.versionNumber}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Source URI</span>
                        <input
                          value={deliverySourceUri}
                          onChange={(event) => setDeliverySourceUri(event.currentTarget.value)}
                          className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          placeholder="Required for feeds, origins, SFTP, or buckets"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Asset kinds</span>
                          <input
                            value={deliveryAssetKinds}
                            onChange={(event) => setDeliveryAssetKinds(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="source, poster, captions"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">Expected files</span>
                          <input
                            value={deliveryExpectedFiles}
                            onChange={(event) => setDeliveryExpectedFiles(event.currentTarget.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                            placeholder="feature.mov, poster.jpg"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold text-muted">Description</span>
                        <textarea
                          value={deliveryDescription}
                          onChange={(event) => setDeliveryDescription(event.currentTarget.value)}
                          rows={3}
                          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                          placeholder="Packaging notes, version context, captions/audio expectations, or known limitations."
                        />
                      </label>

                      {!providerAssetDeliveryCapability ? (
                        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                          This provider role cannot submit asset deliveries.
                        </p>
                      ) : null}

                      <button
                        type="button"
                        disabled={
                          submitAssetDelivery.isPending ||
                          !providerAssetDeliveryCapability ||
                          deliveryKey.trim().length < 3 ||
                          deliveryTitle.trim().length < 3 ||
                          (!['upload', 'manual-ops'].includes(deliverySourceType) && deliverySourceUri.trim().length < 5)
                        }
                        onClick={() => {
                          if (!selectedProviderWorkspace) return;
                          const targetReleaseVersion = selectedDeliveryReleaseVersion;
                          const targetItem = selectedDeliveryItem;
                          submitAssetDelivery.mutate({
                            providerId: selectedProviderWorkspace.provider.id,
                            itemId: targetItem?.id ?? null,
                            releaseVersionId: targetReleaseVersion?.id ?? null,
                            deliveryKey: deliveryKey.trim(),
                            sourceType: deliverySourceType,
                            priority: deliveryPriority,
                            title: deliveryTitle.trim(),
                            description: deliveryDescription.trim() || null,
                            sourceUri: deliverySourceUri.trim() || null,
                            assetManifest: {
                              assetKinds: splitCommaList(deliveryAssetKinds),
                              expectedFiles: splitCommaList(deliveryExpectedFiles),
                              submittedFrom: 'omnilux-app-provider-workspace',
                            },
                            metadata: {
                              providerWorkspaceId: selectedProviderWorkspace.provider.id,
                              targetItemTitle: targetItem?.title ?? null,
                              targetReleaseVersionKey: targetReleaseVersion?.releaseVersionKey ?? null,
                            },
                            source: 'provider-dashboard',
                          });
                        }}
                        className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitAssetDelivery.isPending ? 'Submitting...' : 'Submit delivery'}
                      </button>
                    </div>

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <p className="text-xs font-semibold text-muted">Recent deliveries</p>
                      {selectedProviderWorkspace.assetDeliveries.length === 0 ? (
                        <p className="mt-3 text-sm leading-6 text-muted">
                          No upload, feed, or origin delivery records have been submitted for this provider.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {selectedProviderWorkspace.assetDeliveries.slice(0, 5).map((delivery) => {
                            const linkedItem = providerCatalogItems.find((item) => item.id === delivery.itemId);
                            const linkedRelease = providerReleaseVersions.find((release) => release.id === delivery.releaseVersionId);
                            return (
                              <article key={delivery.id} className="rounded-lg border border-border bg-surface p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                    {providerAssetDeliverySourceLabels[delivery.sourceType]}
                                  </span>
                                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                    {requestStatusLabel(delivery.status)}
                                  </span>
                                  {linkedRelease ? (
                                    <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                      {linkedRelease.releaseVersionKey} v{linkedRelease.versionNumber}
                                    </span>
                                  ) : linkedItem ? (
                                    <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                      {linkedItem.title}
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="mt-2 text-sm font-semibold text-foreground">{delivery.title}</h4>
                                <p className="mt-1 font-mono text-[11px] text-muted">{delivery.deliveryKey}</p>
                                {delivery.operatorNotes ? (
                                  <p className="mt-2 text-xs leading-5 text-muted">{delivery.operatorNotes}</p>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <p className="text-xs font-semibold text-muted">Ingestion jobs</p>
                      {selectedProviderWorkspace.ingestionJobs.length === 0 ? (
                        <p className="mt-3 text-sm leading-6 text-muted">
                          No ingestion or QC jobs have been queued for this provider.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {selectedProviderWorkspace.ingestionJobs.slice(0, 5).map((job) => {
                            const linkedDelivery = selectedProviderWorkspace.assetDeliveries.find(
                              (delivery) => delivery.id === job.assetDeliveryId,
                            );
                            return (
                              <article key={job.id} className="rounded-lg border border-border bg-surface p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                    {job.jobType}
                                  </span>
                                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                    {requestStatusLabel(job.status)}
                                  </span>
                                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                    {job.priority}
                                  </span>
                                </div>
                                <h4 className="mt-2 text-sm font-semibold text-foreground">
                                  {linkedDelivery?.title ?? job.assetDeliveryId ?? job.id}
                                </h4>
                                <p className="mt-1 font-mono text-[11px] text-muted">{job.id}</p>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
                    <div>
                      <p className="text-xs font-semibold text-muted">Operator request</p>
                      <h3 className="mt-1 font-semibold text-foreground">Ask OmniLux to review or act</h3>
                    </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-muted">Request type</span>
                      <select
                        value={requestType}
                        onChange={(event) => setRequestType(event.currentTarget.value as ManagedMediaProviderRequestType)}
                        className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                      >
                        {providerRequestTypes.map((type) => (
                          <option key={type} value={type}>
                            {providerRequestTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-muted">Priority</span>
                      <select
                        value={requestPriority}
                        onChange={(event) => setRequestPriority(event.currentTarget.value as ManagedMediaProviderRequestPriority)}
                        className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                      >
                        {providerRequestPriorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-muted">Catalog item</span>
                      <select
                        value={selectedRequestItem?.id ?? ''}
                        onChange={(event) => {
                          const nextItemId = event.currentTarget.value;
                          setRequestItemId(nextItemId);
                          if (
                            requestReleaseVersionId &&
                            providerReleaseVersions.find((release) => release.id === requestReleaseVersionId)?.itemId !== nextItemId
                          ) {
                            setRequestReleaseVersionId('');
                          }
                        }}
                        className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                      >
                        <option value="">No item link</option>
                        {providerCatalogItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-muted">Release</span>
                      <select
                        value={selectedRequestReleaseVersion?.id ?? ''}
                        onChange={(event) => {
                          const nextReleaseId = event.currentTarget.value;
                          const nextRelease = providerReleaseVersions.find((release) => release.id === nextReleaseId);
                          setRequestReleaseVersionId(nextReleaseId);
                          setRequestItemId(nextRelease?.itemId ?? requestItemId);
                        }}
                        disabled={requestReleaseOptions.length === 0}
                        className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">No release link</option>
                        {requestReleaseOptions.map((release) => (
                          <option key={release.id} value={release.id}>
                            {release.releaseVersionKey} v{release.versionNumber}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-muted">Rights policy</span>
                      <select
                        value={requestRightsPolicyId}
                        onChange={(event) => setRequestRightsPolicyId(event.currentTarget.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                      >
                        <option value="">No rights link</option>
                        {selectedProviderWorkspace.rightsPolicies.map((policy) => (
                          <option key={policy.id} value={policy.id}>
                            {policy.policyKey} {policy.rightsVersion}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-muted">Title</span>
                    <input
                      value={requestTitle}
                      onChange={(event) => setRequestTitle(event.currentTarget.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                      placeholder="Short operator-facing summary"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-muted">Message</span>
                    <textarea
                      value={requestMessage}
                      onChange={(event) => setRequestMessage(event.currentTarget.value)}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                      placeholder="Describe the media, release, rights, or support context."
                    />
                  </label>

                  {!providerRequestCapability ? (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
                      This provider role cannot submit the selected request type.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={
                      submitProviderRequest.isPending ||
                      !providerRequestCapability ||
                      requestTitle.trim().length < 3 ||
                      requestMessage.trim().length < 4
                    }
                    onClick={() => {
                      if (!selectedProviderWorkspace) return;
                      submitProviderRequest.mutate({
                        providerId: selectedProviderWorkspace.provider.id,
                        itemId: selectedRequestItem?.id ?? null,
                        releaseVersionId: selectedRequestReleaseVersion?.id ?? null,
                        rightsPolicyId: requestRightsPolicyId || null,
                        requestType,
                        priority: requestPriority,
                        title: requestTitle.trim(),
                        message: requestMessage.trim(),
                        metadata: {
                          itemTitle: selectedRequestItem?.title ?? null,
                          releaseVersionKey: selectedRequestReleaseVersion?.releaseVersionKey ?? null,
                          submittedFrom: 'omnilux-app-provider-workspace',
                        },
                        source: 'provider-dashboard',
                      });
                    }}
                    className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitProviderRequest.isPending ? 'Submitting...' : 'Submit request'}
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold text-muted">Recent requests</p>
                  {selectedProviderWorkspace.providerRequests.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-muted">No requests have been submitted for this provider.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedProviderWorkspace.providerRequests.slice(0, 6).map((request) => {
                        const linkedItem = providerCatalogItems.find((item) => item.id === request.itemId);
                        const linkedRelease = providerReleaseVersions.find((release) => release.id === request.releaseVersionId);
                        const linkedRightsPolicy = selectedProviderWorkspace.rightsPolicies.find(
                          (policy) => policy.id === request.rightsPolicyId,
                        );
                        return (
                          <article key={request.id} className="rounded-lg border border-border bg-background/70 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                                {providerRequestTypeLabels[request.requestType]}
                              </span>
                              <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                {requestStatusLabel(request.status)}
                              </span>
                              {linkedRelease ? (
                                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                  {linkedRelease.releaseVersionKey} v{linkedRelease.versionNumber}
                                </span>
                              ) : linkedItem ? (
                                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                  {linkedItem.title}
                                </span>
                              ) : null}
                              {linkedRightsPolicy ? (
                                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
                                  {linkedRightsPolicy.policyKey}
                                </span>
                              ) : null}
                            </div>
                            <h3 className="mt-3 text-sm font-semibold text-foreground">{request.title}</h3>
                            {request.operatorResponse ? (
                              <p className="mt-2 text-xs leading-5 text-muted">{request.operatorResponse}</p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Waves,
              title: 'What it is',
              body: 'Managed media is partner and studio content governed by OmniLux Cloud policy.',
            },
            {
              icon: ShieldCheck,
              title: 'What it is not',
              body: 'It is not a replacement for your self-hosted server, your LAN playback, or your private reverse-proxy setup.',
            },
            {
              icon: Sparkles,
              title: 'Where to go next',
              body: 'Use the customer dashboard for previews and entitlement state, then open playback when grants are available.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-background p-5">
              <Icon className="h-5 w-5 text-accent" />
              <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-semibold text-foreground">Self-hosted servers still matter</h2>
          <p className="mt-2 text-sm text-muted">
            Managed media can appear beside local libraries in discovery later, but your OmniLux server is still where
            your own libraries, direct access, and server-level control live.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/dashboard/servers"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              View linked servers
            </Link>
            <a
              href={buildDocsHref('/guide/cloud-product-contract')}
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
