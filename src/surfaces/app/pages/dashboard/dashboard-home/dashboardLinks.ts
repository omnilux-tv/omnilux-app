import {
  CreditCard,
  RadioTower,
  Server,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";

export const dashboardLinks = [
  {
    to: "/dashboard/servers",
    icon: Server,
    label: "Servers",
    description:
      "Optional account links for self-hosted installs after local playback works.",
  },
  {
    to: "/dashboard/account",
    icon: User,
    label: "Account",
    description:
      "Identity, security, and beta communication details for your cloud account.",
  },
  {
    to: "/dashboard/devices",
    icon: Smartphone,
    label: "Devices",
    description:
      "Secondary cloud sessions; the first beta client is the local browser.",
  },
  {
    to: "/dashboard/subscription",
    icon: CreditCard,
    label: "Billing",
    description:
      "Preview plan state. Paid checkout remains closed during private beta.",
  },
  {
    to: "/dashboard/media",
    icon: RadioTower,
    label: "Managed media (separate)",
    description:
      "Entitlement-gated hosted media outside the focused household beta lane.",
  },
] as const;

export type OperatorLink = {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
  description: string;
};

export const createOperatorLink = (href: string): OperatorLink => ({
  href,
  icon: ShieldCheck,
  label: "Ops Console",
  description:
    "Open the separate operator workspace for support, policy, logs, and service health.",
});
