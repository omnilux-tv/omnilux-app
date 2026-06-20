import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const pluginCategories = [
  'Integrations',
  'Security',
  'Themes',
  'Analytics',
  'Automation',
  'Notifications',
];

export const SubmitPlugin = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(pluginCategories[0]);
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    const { error: err } = await supabase.functions.invoke<{
      pluginId: string;
      slug: string;
      submissionStatus: string;
    }>('submit-plugin', {
      body: {
        name: name.trim(),
        displayName: displayName.trim(),
        description: description.trim(),
        category,
        githubUrl: githubUrl.trim() || null,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Plugin submitted</h1>
          <p className="mt-2 text-sm text-muted">
            Your listing is in review. We&apos;ll notify you when it is ready for the ecosystem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-muted">Ecosystem</p>
        <h1 className="mb-3 mt-2 font-display text-2xl font-bold text-foreground">Submit a plugin</h1>
        <p className="mb-8 text-sm text-muted">
          Publish trusted additions from the same account that manages billing, servers, and cloud continuity.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl surface-soft p-6">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
              Package name
            </label>
            <input
              id="name"
              type="text"
              required
              pattern="(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9-]*"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground font-mono focus-ring"
              placeholder="@studio/lastfm-sync"
            />
            <p className="mt-1 text-xs text-muted">Use the package identity customers will recognize, for example `@studio/lastfm-sync`.</p>
          </div>

          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-ring"
              placeholder="Last.fm Sync"
            />
          </div>

          <div>
            <label htmlFor="desc" className="mb-1 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="desc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-ring"
              placeholder="Describe the customer benefit, supported services, and setup requirements."
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-foreground">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              {pluginCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="github" className="mb-1 block text-sm font-medium text-foreground">
              GitHub repo URL
              <span className="ml-1 text-xs text-muted">(optional)</span>
            </label>
            <input
              id="github"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-ring"
              placeholder="https://github.com/studio/lastfm-sync"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit for review'}
          </button>
        </form>
      </div>
    </div>
  );
};
