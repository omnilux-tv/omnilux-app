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

    const packageName = name.trim();
    const slug = packageName.split('/').pop() ?? packageName;

    const { error: err } = await supabase.from('plugins').insert({
      slug,
      name: packageName,
      display_name: displayName,
      description,
      category: category.toLowerCase(),
      long_description: description,
      github_url: githubUrl || null,
      author: user.user_metadata?.display_name ?? user.email,
      author_id: user.id,
      compatibility: '^0.1.0',
      permissions: [],
      trust: 'community',
      published: false,
      version: '1.0.0',
      rating: 0,
      download_count: 0,
      price: 0,
      screenshots: [],
      featured: false,
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
          <h1 className="font-display text-2xl font-bold text-foreground">Plugin Submitted!</h1>
          <p className="mt-2 text-sm text-muted">
            Your plugin is pending review. We&apos;ll notify you when it&apos;s approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Developer Area</p>
        <h1 className="mb-3 mt-2 font-display text-2xl font-bold text-foreground">Submit a Plugin</h1>
        <p className="mb-8 text-sm text-muted">
          Plugin publishing is part of your cloud account tooling, but it stays outside the primary account navigation so the main app remains focused on servers, billing, and remote access.
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
              placeholder="@you/plugin-example"
            />
            <p className="mt-1 text-xs text-muted">Use the canonical package identity that OmniLux should install, for example `@you/plugin-example`.</p>
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
              placeholder="My Plugin"
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
              placeholder="Describe what your plugin does..."
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
              placeholder="https://github.com/you/plugin"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
