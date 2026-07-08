import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { buildAppHref } from "@/lib/site-surface";
import { useAuth } from "@/providers/AuthProvider";
import { invokeCloudAction } from "@/surfaces/app/lib/cloud-functions";

export const InviteAccept = () => {
  const { code } = useParams({ from: "/invite_/$code" });
  const { user, loading: authLoading, provider, signIn, signUp } = useAuth();
  const [status, setStatus] = useState<
    "waiting-for-auth" | "loading" | "success" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const returnTo = `/invite/${code}`;

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("waiting-for-auth");
      return;
    }

    setStatus("loading");
    const accept = async () => {
      try {
        await invokeCloudAction("accept-invite", {
          body: { code },
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Invite could not be accepted."
        );
        setStatus("error");
        return;
      }
      setStatus("success");
    };

    accept();
  }, [authLoading, user, code]);

  const startAuth = async (mode: "sign-in" | "sign-up") => {
    setErrorMessage("");
    setStatus("loading");
    try {
      if (mode === "sign-in") {
        await signIn({ returnTo });
        return;
      }
      await signUp({ returnTo });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Authentication could not be started."
      );
      setStatus("waiting-for-auth");
    }
  };

  if (authLoading || status === "loading") {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center px-4"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">
          {user
            ? "Accepting this OmniLux server invite."
            : "Starting OmniLux Cloud authentication."}
        </span>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  if (status === "waiting-for-auth") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Server invite
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold text-foreground">
            Accept an OmniLux server invite
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Sign in or create an OmniLux Cloud account to accept this invite.
            After AuthKit finishes, you will return here and the invite code
            will be accepted automatically.
          </p>
          <p className="mt-4 rounded-lg bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
            Invite code: {code.toUpperCase()}
          </p>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void startAuth("sign-up")}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Create account to accept
            </button>
            <button
              type="button"
              onClick={() => void startAuth("sign-in")}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              Sign in instead
            </button>
          </div>

          {provider !== "workos" ? (
            <p className="mt-4 text-xs text-muted">
              This environment is using the local authentication bridge;
              production users continue through OmniLux AuthKit.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Invite Failed
          </h1>
          <p role="alert" className="mt-2 text-sm text-muted">
            {errorMessage}
          </p>
          <a
            href={buildAppHref("/dashboard")}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Go to Cloud Console
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center" role="status" aria-live="polite">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Invite Accepted!
        </h1>
        <p className="mt-2 text-sm text-muted">
          You now have access to this claimed OmniLux server through your cloud
          account.
        </p>
        <Link
          to="/dashboard/servers"
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          View Claimed Servers
        </Link>
      </div>
    </div>
  );
};
