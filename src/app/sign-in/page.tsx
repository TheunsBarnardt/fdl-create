'use client';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await signIn('credentials', {
      email,
      password,
      redirect: true,
      redirectTo: searchParams.get('callbackUrl') ?? '/'
    });

    if (result?.error) {
      setError('Invalid credentials');
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
          <CardTitle className="text-base">Sign in to FDL-Create</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input name="email" type="email" required autoComplete="email" defaultValue="admin@fdl.local" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password</label>
              <Input name="password" type="password" required autoComplete="current-password" defaultValue="admin123" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              Demo: <span className="font-mono">admin@fdl.local</span> / <span className="font-mono">admin123</span>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              New here? <a href="/sign-up" className="text-accent hover:underline">Create an account</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
