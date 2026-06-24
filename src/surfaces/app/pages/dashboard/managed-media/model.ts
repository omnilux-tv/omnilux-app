import {
  type ManagedMediaAssetDeliverySourceType,
  type ManagedMediaCatalogDetails,
  type ManagedMediaProviderRequestPriority,
  type ManagedMediaProviderRequestType,
  type ManagedMediaProviderWritableCatalogStatus,
  type ManagedMediaProviderWritableReleaseStatus,
  type ManagedMediaType,
} from '@omnilux/types';

export const fallbackMediaOrigin = 'https://media.omnilux.tv';

export const mediaTypeOptions: readonly ManagedMediaType[] = [
  'video',
  'audio',
  'channel',
  'live-event',
  'game',
  'book',
  'interactive',
];

export const providerRequestTypes: ManagedMediaProviderRequestType[] = [
  'publish',
  'qc_review',
  'rights_review',
  'metadata_update',
  'takedown',
  'rollback',
  'support',
  'issue_response',
];

export const providerRequestPriorities: ManagedMediaProviderRequestPriority[] = ['low', 'normal', 'high', 'urgent'];
export const providerCatalogStatuses: ManagedMediaProviderWritableCatalogStatus[] = ['draft', 'ingesting', 'qc', 'rights_review'];
export const providerReleaseStatuses: ManagedMediaProviderWritableReleaseStatus[] = ['draft', 'ingesting', 'qc', 'rights_review'];
export const providerAssetDeliverySourceTypes: ManagedMediaAssetDeliverySourceType[] = [
  'upload',
  'feed',
  'origin-url',
  'sftp',
  'storage-bucket',
  'manual-ops',
];

export const providerRequestTypeLabels: Record<ManagedMediaProviderRequestType, string> = {
  publish: 'Publish',
  qc_review: 'QC review',
  rights_review: 'Rights review',
  metadata_update: 'Metadata update',
  takedown: 'Takedown',
  rollback: 'Rollback',
  support: 'Support',
  issue_response: 'Issue response',
};

export const providerAssetDeliverySourceLabels: Record<ManagedMediaAssetDeliverySourceType, string> = {
  upload: 'Upload',
  feed: 'Feed',
  'origin-url': 'Origin URL',
  sftp: 'SFTP',
  'storage-bucket': 'Storage bucket',
  'manual-ops': 'Manual ops',
};

export const providerUnitKindLabels: Record<string, string> = {
  root: 'Root provider',
  label: 'Label',
  studio: 'Studio',
  region: 'Region',
  business_unit: 'Business unit',
};

export const numberFormatter = new Intl.NumberFormat();
export const reportingDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export const requestStatusLabel = (value: string) => value.replaceAll('_', ' ');

export const splitCommaList = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const toIsoTimestamp = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export const downloadTextFile = (filename: string, contents: string, type: string) => {
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

const joinList = (value: readonly string[] | undefined) => (value && value.length > 0 ? value.join(', ') : undefined);

export const catalogDetailFacts = (mediaType: ManagedMediaType, details: ManagedMediaCatalogDetails | undefined) => {
  if (!details) return [];
  const facts: Array<{ label: string; value: string | number | undefined }> = [
    { label: 'Original title', value: details.common?.originalTitle },
    { label: 'Edition', value: details.common?.edition },
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
