import { useState } from "react";
import type { AccessProfilePrivateBeta } from "@/surfaces/app/lib/access-profile";
import { invokeCloudFunction } from "@/surfaces/app/lib/cloud-functions";
import {
  buildPrivateBetaRequestBody,
  getPrivateBetaNextActionCopy,
  getPrivateBetaStateLabel,
  PRIVATE_BETA_CONSENT_VERSION,
  privateBetaCanBeRequested,
} from "@/surfaces/app/lib/private-beta";

type SubmissionState = "idle" | "submitting" | "recorded" | "error";

type PrivateBetaStatusCardProps = {
  privateBeta: AccessProfilePrivateBeta | null | undefined;
  isLoading: boolean;
  loadError: unknown;
  reviewRequested: boolean;
  onRequestRecorded: () => Promise<unknown> | unknown;
  onReviewHandled: () => void;
};

export const PrivateBetaStatusCard = ({
  privateBeta,
  isLoading,
  loadError,
  reviewRequested,
  onRequestRecorded,
  onReviewHandled,
}: PrivateBetaStatusCardProps) => {
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const canRequest = privateBetaCanBeRequested(privateBeta);

  const submitRequest = async () => {
    setSubmissionState("submitting");
    setSubmissionError(null);
    try {
      await invokeCloudFunction("request-private-beta-access", {
        body: buildPrivateBetaRequestBody(
          `${window.location.pathname}${window.location.search}`
        ),
      });
      await onRequestRecorded();
      onReviewHandled();
      setSubmissionState("recorded");
    } catch (error) {
      setSubmissionState("error");
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Private beta request could not be recorded."
      );
    }
  };

  const stateLabel = isLoading
    ? "Loading status"
    : loadError
      ? "Status unavailable"
      : getPrivateBetaStateLabel(privateBeta);

  return (
    <section
      className={`mt-8 rounded-xl border p-6 ${reviewRequested && canRequest ? "border-accent/50 bg-accent/10" : "border-border bg-background"}`}
      aria-labelledby="private-beta-status-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Controlled household beta
          </p>
          <h2
            id="private-beta-status-title"
            className="mt-2 font-display text-xl font-bold text-foreground"
          >
            Beta access status
          </h2>
          <p className="mt-2 text-sm text-muted">
            The first cohort is a browser-first, side-by-side trial for an
            existing personal media library. Requesting access does not purchase
            a plan or authorize an artifact.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground">
          {stateLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl surface-soft p-4">
          <h3 className="text-sm font-semibold text-foreground">
            What you are agreeing to
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              Use an approved immutable artifact only when one is supplied.
            </li>
            <li>
              Mount your existing library read-only and keep your incumbent
              server running.
            </li>
            <li>
              Share task outcomes and coarse timing for the guided beta session.
            </li>
            <li>
              Raw cohort notes are retained for at most 90 days and deleted on
              request.
            </li>
          </ul>
        </div>
        <div className="rounded-xl surface-soft p-4">
          <h3 className="text-sm font-semibold text-foreground">
            What OmniLux will not collect
          </h3>
          <p className="mt-3 text-sm text-muted">
            No media titles, filenames, library paths, playback positions, raw
            IP addresses, or household-member identity are part of the beta
            worksheet.
          </p>
        </div>
      </div>

      <div className="mt-5" aria-live="polite">
        {loadError ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            Beta status could not be loaded. Refresh the page before submitting
            so an existing request is not duplicated.
          </div>
        ) : canRequest ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void submitRequest()}
              disabled={isLoading || submissionState === "submitting"}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submissionState === "submitting"
                ? "Recording request…"
                : "Confirm and request beta access"}
            </button>
            <span className="text-sm text-muted">
              Consent version: {PRIVATE_BETA_CONSENT_VERSION}
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            <p className="font-semibold">{stateLabel}</p>
            <p className="mt-1 text-muted">
              {getPrivateBetaNextActionCopy(privateBeta)}
            </p>
          </div>
        )}

        {submissionState === "recorded" ? (
          <p className="mt-3 text-sm text-success">
            Your request was recorded. The status above is now the source of
            truth.
          </p>
        ) : null}
        {submissionState === "error" ? (
          <p className="mt-3 text-sm text-danger">
            {submissionError ??
              "Private beta request could not be recorded. Review the error and retry."}
          </p>
        ) : null}
      </div>
    </section>
  );
};
