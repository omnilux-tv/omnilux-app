import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/providers/AuthProvider";
import {
  CLAIM_CODE_LENGTH,
  applyClaimCodeInput,
  normalizeClaimCodeInput,
} from "@/surfaces/app/lib/claim-code";
import { invokeCloudFunction } from "@/surfaces/app/lib/cloud-functions";

const claimCodeErrorId = "claim-code-error";
const claimCodeHelpId = "claim-code-help";

interface ClaimServerProps {
  initialCode?: string;
}

interface ClaimServerResponse {
  serverId: string;
}

export const ClaimServer = ({ initialCode }: ClaimServerProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CLAIM_CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!initialCode) {
      return;
    }

    const normalized = normalizeClaimCodeInput(initialCode);

    if (normalized.length === 0) {
      return;
    }

    setCode((current) => current.map((_, index) => normalized[index] ?? ""));
  }, [initialCode]);

  const handleChange = (index: number, value: string) => {
    const normalized = normalizeClaimCodeInput(value);
    if (normalized.length === 0) {
      const next = [...code];
      next[index] = "";
      setCode(next);
      return;
    }

    const next = applyClaimCodeInput(code, index, value);
    setCode(next);
    setError(null);

    const nextFocusIndex = Math.min(
      index + normalized.length,
      CLAIM_CODE_LENGTH - 1
    );
    if (nextFocusIndex !== index || index < CLAIM_CODE_LENGTH - 1) {
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handlePaste = (
    index: number,
    event: ClipboardEvent<HTMLInputElement>
  ) => {
    const pastedCode = event.clipboardData.getData("text");
    if (normalizeClaimCodeInput(pastedCode).length === 0) {
      return;
    }

    event.preventDefault();
    handleChange(index, pastedCode);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const claimCode = code.join("");
    if (claimCode.length !== CLAIM_CODE_LENGTH) {
      setError("Enter the full 6-character claim code.");
      return;
    }

    setError(null);
    setLoading(true);

    if (!session) {
      setError("Sign in again before attaching a server.");
      setLoading(false);
      return;
    }

    let data: ClaimServerResponse;
    try {
      data = await invokeCloudFunction<ClaimServerResponse>("claim-server", {
        body: { code: claimCode },
      });
    } catch (invokeError) {
      setError(
        invokeError instanceof Error
          ? invokeError.message
          : "Invalid or expired claim code."
      );
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["servers"] });

    if (data?.serverId) {
      navigate({
        to: "/dashboard/servers/$serverId",
        params: { serverId: data.serverId },
      });
      return;
    }

    navigate({ to: "/dashboard/servers" });
  };

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">
          Attach a self-hosted server
        </h1>
        <p id={claimCodeHelpId} className="mb-8 text-center text-sm text-muted">
          Enter the 6-character code shown during OmniLux setup to attach that
          self-hosted server to your OmniLux Cloud account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              id={claimCodeErrorId}
              role="alert"
              className="rounded-lg bg-danger/10 p-3 text-center text-sm text-danger"
            >
              {error}
            </div>
          )}

          <fieldset
            className="space-y-3"
            aria-describedby={`${claimCodeHelpId}${error ? ` ${claimCodeErrorId}` : ""}`}
          >
            <legend className="sr-only">Server claim code</legend>
            <div className="flex justify-center gap-2">
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  aria-label={`Claim code character ${i + 1} of ${CLAIM_CODE_LENGTH}`}
                  aria-invalid={error ? true : undefined}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  inputMode="text"
                  maxLength={1}
                  pattern="[A-Za-z0-9]"
                  value={char}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  className="h-14 w-12 rounded-lg border border-border bg-input text-center text-xl font-bold text-foreground focus-ring"
                />
              ))}
            </div>
          </fieldset>

          {loading ? (
            <p
              role="status"
              aria-live="polite"
              className="text-center text-sm text-muted"
            >
              Attaching this self-hosted server to your OmniLux Cloud account…
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || code.some((c) => !c)}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "Attaching..." : "Attach server"}
          </button>
        </form>
      </div>
    </div>
  );
};
