import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Lock, Eye, EyeOff, Workflow } from 'lucide-react';
import axios from 'axios';

export default function LoginPage() {
  const { status, login, setupPassword } = useAuth();
  const isSetup = status === 'setup';

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (password.length < 12) {
        setError('Password must be at least 12 characters');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSetup) {
        await setupPassword(password);
      } else {
        await login(password);
      }
    } catch (err) {
      setError(
        axios.isAxiosError<{ error?: string }>(err)
          ? (err.response?.data?.error ?? 'Something went wrong')
          : 'Something went wrong',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Flowy</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {isSetup ? 'Create a password to secure your hub' : 'Sign in to your hub'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-soft">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-[13px]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSetup ? 'Choose a strong password' : 'Enter your password'}
                  className="pr-10"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSetup && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm" className="text-[13px]">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className={cn('rounded-md bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive')}>
                {error}
              </p>
            )}

            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? (isSetup ? 'Setting up…' : 'Signing in…') : (isSetup ? 'Set password & continue' : 'Sign in')}
            </Button>
          </form>
        </div>

        {isSetup && (
          <p className="mt-4 text-center text-[12px] text-muted-foreground/70">
            This password secures access to your Flowy hub.
          </p>
        )}
      </div>
    </div>
  );
}
