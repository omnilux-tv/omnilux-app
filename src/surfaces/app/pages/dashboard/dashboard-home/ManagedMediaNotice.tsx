import type { CustomerOverview } from '@/surfaces/app/lib/customer-overview';

type ManagedMediaNoticeProps = {
  customerOverview: CustomerOverview | undefined;
};

export const ManagedMediaNotice = ({ customerOverview }: ManagedMediaNoticeProps) => {
  if (
    !customerOverview ||
    (customerOverview.platform.managedMediaOperatingMode === 'normal' && !customerOverview.platform.managedMediaIncidentMessage)
  ) {
    return null;
  }

  return (
    <div className="mt-8 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
      <p className="text-xs font-semibold text-warning">Managed media status</p>
      <p className="mt-2 text-lg font-semibold">{customerOverview.platform.managedMediaOperatingModeLabel}</p>
      <p className="mt-2 text-muted">
        {customerOverview.platform.managedMediaIncidentMessage ||
          'OmniLux has published a service notice for OmniLux Media.'}
      </p>
    </div>
  );
};
