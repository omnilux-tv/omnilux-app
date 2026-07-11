import { type OperatorLink } from './dashboardLinks';

type EcosystemToolsProps = {
  operatorLink: OperatorLink | null;
};

export const EcosystemTools = ({ operatorLink }: EcosystemToolsProps) =>
  operatorLink ? (
    <section className="mt-12">
      <div className="max-w-2xl">
        <h2 className="font-display text-xl font-bold text-foreground">Operator tools</h2>
        <p className="mt-2 text-sm text-muted">
          Operator-only controls stay separate from the main household account flow.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <OperatorLinkCard link={operatorLink} />
      </div>
    </section>
  ) : null;

const OperatorLinkCard = ({ link }: { link: OperatorLink }) => {
  const Icon = link.icon;
  return (
    <a href={link.href} className="group rounded-xl border border-border bg-background p-5 transition-colors hover:bg-surface">
      <Icon className="mb-3 h-6 w-6 text-accent" />
      <h3 className="font-semibold text-foreground">{link.label}</h3>
      <p className="mt-1 text-sm text-muted">{link.description}</p>
    </a>
  );
};
