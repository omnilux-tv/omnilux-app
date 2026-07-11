import type {
  AccessProfilePrivateBeta,
  PrivateBetaNextAction,
  PrivateBetaState,
} from "./access-profile";

export const PRIVATE_BETA_REVIEW_INTENT = "private-beta-review";
export const PRIVATE_BETA_CONSENT_VERSION = "household-beta-v1";

export const hasPrivateBetaReviewIntent = (search: string): boolean =>
  new URLSearchParams(search).get("intent") === PRIVATE_BETA_REVIEW_INTENT;

export const privateBetaStateLabels: Record<PrivateBetaState, string> = {
  "not-requested": "Not requested",
  requested: "Request received",
  "pending-review": "Pending review",
  "approved-no-artifact": "Approved — artifact not ready",
  "install-ready": "Install ready",
  "approved-unclaimed": "Approved — server not linked",
  linked: "Server linked",
  unavailable: "Status unavailable",
};

export const getPrivateBetaStateLabel = (
  privateBeta: AccessProfilePrivateBeta | null | undefined
): string =>
  privateBeta ? privateBetaStateLabels[privateBeta.state] : "Loading status";

const privateBetaNextActionCopy: Record<PrivateBetaNextAction, string> = {
  "review-and-confirm":
    "Review the beta boundaries and explicitly confirm the request below.",
  "await-review":
    "Your request is recorded. Watch your account email while the cohort is reviewed.",
  "await-approved-artifact":
    "Your account is approved, but installation stays blocked until an exact artifact is approved.",
  "install-approved-artifact":
    "Use only the exact approved digest supplied with your beta instructions.",
  "claim-installed-server":
    "Complete local playback first, then claim the installed server if you want account-linked features.",
  "open-linked-server":
    "Open the linked server and continue with remote access or one household invite.",
  "contact-beta-support":
    "Status could not be resolved. Contact beta support before installing or retrying.",
};

export const getPrivateBetaNextActionCopy = (
  privateBeta: AccessProfilePrivateBeta | null | undefined
): string =>
  privateBeta
    ? (privateBetaNextActionCopy[privateBeta.nextAction] ??
      "Beta status needs review. Contact beta support before installing or retrying.")
    : "Load your account status before taking the next beta step.";

export const privateBetaCanBeRequested = (
  privateBeta: AccessProfilePrivateBeta | null | undefined
): boolean => !privateBeta || privateBeta.state === "not-requested";

export const buildPrivateBetaRequestBody = (landingPath: string) => ({
  source: "account-household-beta",
  landingPath,
  consent: true,
  consentVersion: PRIVATE_BETA_CONSENT_VERSION,
});
