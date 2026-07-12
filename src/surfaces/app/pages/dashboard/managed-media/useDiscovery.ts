import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  filterManagedDiscoveryItems,
  managedMediaFixtureItems,
  type ManagedDiscoveryItem,
  type ManagedMediaCatalogItemDetailRequest,
  type ManagedMediaCatalogItemDetailResponse,
  type ManagedMediaDiscoveryRequest,
  type ManagedMediaDiscoveryResponse,
  type ManagedMediaPlaybackGrantIssueRequest,
  type ManagedMediaType,
} from "@omnilux/types";
import { invokeCloudFunction } from "@/surfaces/app/lib/cloud-functions";
import {
  consumeManagedMediaPlaybackGrant,
  launchManagedMediaPlayback,
  recordManagedMediaUsageEvent,
} from "@/surfaces/app/lib/managed-media-launch";
import { catalogDetailFacts } from "./model";

type DiscoveryArgs = {
  enabled: boolean;
  getAccessToken: () => Promise<string | null>;
  managedMediaOrigin: string;
  setLaunchError: (message: string | null) => void;
};

export const useDiscovery = ({
  enabled,
  getAccessToken,
  managedMediaOrigin,
  setLaunchError,
}: DiscoveryArgs) => {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ManagedMediaType | "all">(
    "all"
  );
  const [selectedDiscoveryItemId, setSelectedDiscoveryItemId] = useState<
    string | null
  >(null);
  const [playbackLaunchItemId, setPlaybackLaunchItemId] = useState<
    string | null
  >(null);
  const [activePlayback, setActivePlayback] = useState<{
    itemId: string;
    title: string;
    url: string;
  } | null>(null);

  const cloudDiscoveryQuery = useQuery({
    queryKey: ["managed-media-discovery", selectedType, query],
    queryFn: () => {
      const body: ManagedMediaDiscoveryRequest = {
        mediaTypes: selectedType === "all" ? undefined : [selectedType],
        query: query.trim() || undefined,
        limit: 100,
      };
      return invokeCloudFunction<ManagedMediaDiscoveryResponse>(
        "list-managed-media-discovery",
        { body }
      );
    },
    enabled,
  });

  const sourceItems =
    cloudDiscoveryQuery.data?.discoveryItems &&
    cloudDiscoveryQuery.data.discoveryItems.length > 0
      ? cloudDiscoveryQuery.data.discoveryItems
      : managedMediaFixtureItems;
  const usingCloudDiscovery =
    sourceItems === cloudDiscoveryQuery.data?.discoveryItems;
  const discoveryItems = filterManagedDiscoveryItems(sourceItems, {
    audience: "signed-in",
    query,
    mediaTypes: selectedType === "all" ? undefined : [selectedType],
  });
  const selectedDiscoveryItem = selectedDiscoveryItemId
    ? (discoveryItems.find((item) => item.id === selectedDiscoveryItemId) ??
      null)
    : null;

  const detailQuery = useQuery({
    queryKey: [
      "managed-media-catalog-item-detail",
      selectedDiscoveryItem?.id,
      selectedDiscoveryItem?.playback?.releaseVersionId,
    ],
    queryFn: () => {
      if (!selectedDiscoveryItem)
        throw new Error("Select a managed media item before loading details.");
      const body: ManagedMediaCatalogItemDetailRequest = {
        itemId: selectedDiscoveryItem.id,
        releaseVersionId: selectedDiscoveryItem.playback?.releaseVersionId,
        country: selectedDiscoveryItem.playback?.country,
      };
      return invokeCloudFunction<ManagedMediaCatalogItemDetailResponse>(
        "get-managed-media-catalog-item",
        { body }
      );
    },
    enabled: Boolean(selectedDiscoveryItem && usingCloudDiscovery),
  });

  const selectedDetailItem = detailQuery.data?.item ?? selectedDiscoveryItem;
  const selectedCatalogDetailFacts = selectedDetailItem
    ? catalogDetailFacts(
        selectedDetailItem.mediaType,
        selectedDetailItem.catalogDetails
      )
    : [];

  const launchDiscoveryItem = async (item: ManagedDiscoveryItem) => {
    if (!item.playback) {
      setLaunchError(
        "This managed media item does not have a playback target yet."
      );
      return;
    }

    setPlaybackLaunchItemId(item.id);
    setLaunchError(null);
    try {
      const action = item.playback.action ?? "play";
      const grantRequest: ManagedMediaPlaybackGrantIssueRequest =
        usingCloudDiscovery
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
        source: "app.omnilux.tv",
        metadata: {
          launchSurface: "managed-media-dashboard",
          itemId: result.launch.itemId,
          assetId: result.launch.assetId,
          releaseVersionId: result.launch.releaseVersionId,
          correlationId: result.launch.grant.audit.correlationId,
        },
      }).catch((error) =>
        console.warn(
          "Managed media playback grant could not be marked consumed.",
          error
        )
      );
      await recordManagedMediaUsageEvent({
        mediaOrigin: managedMediaOrigin,
        getAccessToken,
        event: {
          eventType: "play-start",
          itemId: result.launch.itemId,
          assetId: result.launch.assetId,
          mediaType: result.launch.mediaType,
          providerId: result.launch.providerId,
          grantId: result.launch.grant.grantId,
          occurredAt: new Date().toISOString(),
          region: item.playback.country
            ? { ipCountry: item.playback.country }
            : undefined,
          device: { deviceType: "browser", surface: "app.omnilux.tv" },
          policy: {
            allowedActions: result.launch.grant.allowedActions,
            allowedRenditions: result.launch.grant.allowedRenditions,
            deliveryPolicyId: result.launch.asset.deliveryPolicyId,
            protectionPolicyId: result.launch.asset.protectionPolicyId,
          },
          metadata: {
            launchSurface: "managed-media-dashboard",
            releaseVersionId: result.launch.releaseVersionId,
            correlationId: result.launch.grant.audit.correlationId,
          },
        },
      }).catch((error) =>
        console.warn("Managed media usage event could not be recorded.", error)
      );
      setActivePlayback({
        itemId: item.id,
        title: item.title,
        url: new URL(
          result.launch.stream.directFileUrl,
          managedMediaOrigin
        ).toString(),
      });
    } catch (caughtError) {
      setLaunchError(
        caughtError instanceof Error
          ? caughtError.message
          : "OmniLux Media could not prepare playback for this item."
      );
    } finally {
      setPlaybackLaunchItemId(null);
    }
  };

  return {
    activePlayback,
    closePlayback: () => setActivePlayback(null),
    query,
    setQuery,
    selectedType,
    setSelectedType,
    selectedDiscoveryItemId,
    setSelectedDiscoveryItemId,
    playbackLaunchItemId,
    cloudDiscovery: cloudDiscoveryQuery.data,
    cloudDiscoveryError: cloudDiscoveryQuery.error,
    isCloudDiscoveryLoading: cloudDiscoveryQuery.isLoading,
    discoveryItems,
    selectedDetailItem,
    selectedCatalogDetailFacts,
    selectedCatalogItemDetail: detailQuery.data,
    selectedCatalogItemDetailError: detailQuery.error,
    isSelectedCatalogItemDetailLoading: detailQuery.isLoading,
    launchDiscoveryItem,
  };
};
