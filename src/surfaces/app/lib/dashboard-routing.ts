export interface DashboardAccessProfile {
  isOperator?: boolean | null;
}

export const getCustomerDashboardRedirect = (
  accessProfile: DashboardAccessProfile | null | undefined,
  opsDashboardHref: string,
): string | null => (
  accessProfile?.isOperator === true ? opsDashboardHref : null
);
