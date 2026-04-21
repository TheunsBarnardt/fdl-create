'use client';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function SignUpPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const name = (fd.get('name') as string) || undefined;
    const password = fd.get('password') as string;

    const signup = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password })
    });

    if (!signup.ok) {
      const data = await signup.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not create account');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: true,
      redirectTo: '/'
    });
    if (result?.error) {
      setError('Account created, but sign-in failed. Try signing in.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center mb-2">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="text-base">Create your FDL-Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Display name (optional)</label>
              <Input name="name" autoComplete="name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password</label>
              <Input name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              Already have an account? <a href="/sign-in" className="text-accent hover:underline">Sign in</a>
            </p>
            <p className="text-[10px] text-center text-muted-foreground">
              The first account created becomes an admin. Later accounts default to editor.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
