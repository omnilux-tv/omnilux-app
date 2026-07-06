import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { buildOpsHref } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { invokeCloudFunction } from '@/surfaces/app/lib/cloud-functions';
import { useCustomerOverview } from '@/surfaces/app/lib/customer-overview';
import { getCustomerDashboardRedirect } from '@/surfaces/app/lib/dashboard-routing';
import { CoreJourney } from './dashboard/dashboard-home/CoreJourney';
import { EcosystemTools } from './dashboard/dashboard-home/EcosystemTools';
import { ManagedMediaNotice } from './dashboard/dashboard-home/ManagedMediaNotice';
import { PrimaryDashboardLinks } from './dashboard/dashboard-home/PrimaryDashboardLinks';
import { createOperatorLink } from './dashboard/dashboard-home/dashboardLinks';

type PrivateBetaRequestState = 'idle' | 'pending' | 'recorded' | 'error';

const privateBetaIntentIsPresent = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('intent') === 'private-beta-request';
};

const clearPrivateBetaIntent = () => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.delete('intent');
  const query = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const {
    data: customerOverview,
    isLoading: isCustomerOverviewLoading,
    error: customerOverviewError,
  } = useCustomerOverview();
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'User';
  const opsDashboardHref = buildOpsHref('/dashboard');
  const operatorRedirectHref = getCustomerDashboardRedirect(accessProfile, opsDashboardHref);
  const operatorLink = operatorRedirectHref ? createOperatorLink(operatorRedirectHref) : null;
  const betaRequestHandledRef = useRef(false);
  const [privateBetaRequestState, setPrivateBetaRequestState] = useState<PrivateBetaRequestState>('idle');
  const [privateBetaRequestError, setPrivateBetaRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (operatorRedirectHref) {
      window.location.replace(operatorRedirectHref);
    }
  }, [operatorRedirectHref]);

  useEffect(() => {
    if (!user || betaRequestHandledRef.current || !privateBetaIntentIsPresent()) return;

    betaRequestHandledRef.current = true;
    setPrivateBetaRequestState('pending');
    setPrivateBetaRequestError(null);

    void invokeCloudFunction<{ message?: unknown }>('request-private-beta-access', {
      body: {
        source: 'marketing-private-beta',
        landingPath: `${window.location.pathname}${window.location.search}`,
      },
    })
      .then(() => {
        setPrivateBetaRequestState('recorded');
        clearPrivateBetaIntent();
      })
      .catch((error) => {
        betaRequestHandledRef.current = false;
        setPrivateBetaRequestState('error');
        setPrivateBetaRequestError(
          error instanceof Error ? error.message : 'Private beta request could not be recorded.',
        );
      });
  }, [user]);

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-muted">Account</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {displayName}, this is your OmniLux account hub. Your libraries and playback stay on your server, while this
          space handles identity, billing, and connected experiences around it.
        </p>

        <ManagedMediaNotice customerOverview={customerOverview} />
        <PrivateBetaRequestNotice state={privateBetaRequestState} error={privateBetaRequestError} />
        <PrimaryDashboardLinks />
        <CoreJourney
          customerOverview={customerOverview}
          isLoading={isCustomerOverviewLoading}
          error={customerOverviewError}
        />
        <EcosystemTools operatorLink={operatorLink} />
      </div>
    </div>
  );
};

function PrivateBetaRequestNotice({
  state,
  error,
}: {
  state: PrivateBetaRequestState;
  error: string | null;
}) {
  if (state === 'idle') return null;

  if (state === 'error') {
    return (
      <div className="mt-8 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        {error ?? 'Private beta request could not be recorded. Refresh this page to retry.'}
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-foreground">
      <p className="font-semibold">
        {state === 'pending' ? 'Recording your private beta request...' : 'Private beta request recorded.'}
      </p>
      <p className="mt-1 text-muted">
        {state === 'pending'
          ? 'Your OmniLux account is being added to the private beta request list.'
          : 'Your account is now on the private beta list. Watch your account email for setup updates while you explore the dashboard.'}
      </p>
    </div>
  );
}
