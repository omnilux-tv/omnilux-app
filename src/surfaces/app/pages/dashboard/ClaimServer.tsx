import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';

const CODE_LENGTH = 6;

interface ClaimServerProps {
  initialCode?: string;
}

interface ClaimServerResponse {
  serverId: string;
}

export const ClaimServer = ({ initialCode }: ClaimServerProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!initialCode) {
      return;
    }

    const normalized = initialCode
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH)
      .split('');

    if (normalized.length === 0) {
      return;
    }

    setCode((current) => current.map((_, index) => normalized[index] ?? ''));
  }, [initialCode]);

  const handleChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    if (char && !/[A-Z0-9]/.test(char)) return;

    const next = [...code];
    next[index] = char;
    setCode(next);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const claimCode = code.join('');
    if (claimCode.length !== CODE_LENGTH) {
      setError('Enter the full 6-character claim code.');
      return;
    }

    setError(null);
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setError('Sign in again before attaching a server.');
      setLoading(false);
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke<ClaimServerResponse>('claim-server', {
      body: { code: claimCode },
    });

    if (invokeError) {
      setError(invokeError.message || 'Invalid or expired claim code.');
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['servers'] });

    if (data?.serverId) {
      navigate({
        to: '/dashboard/servers/$serverId',
        params: { serverId: data.serverId },
      });
      return;
    }

    navigate({ to: '/dashboard/servers' });
  };

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">
          Attach a Self-Hosted Server
        </h1>
        <p className="mb-8 text-center text-sm text-muted">
          Enter the 6-character code shown during OmniLux setup to attach that self-hosted server
          to your OmniLux Cloud account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 text-center text-sm text-danger">{error}</div>
          )}

          <div className="flex justify-center gap-2">
            {code.map((char, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                maxLength={1}
                value={char}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-lg border border-border bg-input text-center text-xl font-bold text-foreground uppercase focus-ring"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.some((c) => !c)}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Attaching...' : 'Attach server'}
          </button>
        </form>
      </div>
    </div>
  );
};
