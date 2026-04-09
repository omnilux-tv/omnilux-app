import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { buildAppHref } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export const InviteAccept = () => {
  const { code } = useParams({ from: '/invite_/$code' });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate({ to: '/register', search: { redirect: `/invite/${code}` } as never });
      return;
    }

    const accept = async () => {
      const { error } = await supabase.functions.invoke('accept-invite', {
        body: { code },
      });
      if (error) {
        setErrorMessage(error.message);
        setStatus('error');
        return;
      }
      setStatus('success');
    };

    accept();
  }, [authLoading, user, code, navigate]);

  if (authLoading || status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Invite Failed</h1>
          <p className="mt-2 text-sm text-muted">{errorMessage}</p>
          <a href={buildAppHref('/dashboard')} className="mt-4 inline-block text-sm text-accent hover:underline">
            Go to Cloud Console
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Invite Accepted!</h1>
        <p className="mt-2 text-sm text-muted">You now have access to this claimed OmniLux server through your cloud account.</p>
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
