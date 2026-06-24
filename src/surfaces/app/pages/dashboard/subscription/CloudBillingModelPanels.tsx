import type { SubscriptionBillingViewModel } from './useSubscriptionBilling';

type CloudBillingModelPanelsProps = {
  vm: SubscriptionBillingViewModel;
};

export const CloudBillingModelPanels = ({ vm }: CloudBillingModelPanelsProps) => (
  <>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl surface-soft p-6">
        <h2 className="text-lg font-bold text-foreground">Included with OmniLux Cloud</h2>
        <p className="mt-2 text-sm text-muted">
          Your cloud account covers identity, hosted account services, and first-party OmniLux media access.
        </p>
        <BulletList
          bullets={[
            vm.accessProfile?.managedMediaEntitled
              ? 'Managed media is enabled for this account.'
              : 'Managed media is currently disabled for this account.',
            'Local playback and direct self-hosted access stay free.',
            'Billing, account recovery, and device sign-in run through the hosted cloud account.',
          ]}
        />
        <p className="mt-4 text-xs text-muted">
          The customer-facing promise is documented in the hosted product contract so billing, app copy, and future
          native clients stay aligned.
        </p>
      </div>

      <div className="rounded-xl surface-soft p-6">
        <h2 className="text-lg font-bold text-foreground">Paid cloud access</h2>
        <p className="mt-2 text-sm text-muted">
          Self-hosted relay access follows the current platform rule, while local and user-owned direct access stay
          outside cloud billing. Browser remote sessions require an eligible account, an online tunnel, and a compatible
          OmniLux server.
        </p>
        <div className="mt-4 rounded-lg bg-surface/60 p-4">
          <p className="text-xs font-semibold text-muted">Self-hosted remote access</p>
          <p className="mt-2 text-foreground">{vm.accessProfile?.relayAccessPolicyLabel ?? 'Paid cloud plan required'}</p>
          <p className="mt-2 text-sm text-muted">
            {vm.accessProfile?.relayAccessPolicyDescription ??
              'Self-hosted relay access requires an active OmniLux Cloud plan for remote browser sessions.'}
          </p>
          <p className="mt-3 text-xs text-muted">
            {vm.accessProfile?.hasPaidCloudPlan
              ? 'This account currently has active paid cloud access.'
              : 'This account does not currently have active paid cloud access.'}
          </p>
        </div>
        <p className="mt-4 text-xs text-muted">
          Direct LAN, VPN, and user-owned reverse-proxy access are intentionally outside OmniLux cloud billing.
        </p>
      </div>
    </div>

    <div className="rounded-xl border border-border bg-background p-6">
      <h2 className="text-lg font-bold text-foreground">Billing follows the product model</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ['Always free', 'Direct access to your own self-hosted server, local playback, and user-owned network paths.'],
          ['Included in cloud', 'Hosted identity, account recovery, device sign-in, and managed OmniLux media according to policy.'],
          ['Paid when needed', 'Self-hosted relay access and higher-tier cloud services around your private OmniLux server.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl bg-surface/60 p-4">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </div>
  </>
);

const BulletList = ({ bullets }: { bullets: string[] }) => (
  <ul className="mt-4 space-y-2">
    {bullets.map((bullet) => (
      <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
        <span>{bullet}</span>
      </li>
    ))}
  </ul>
);
