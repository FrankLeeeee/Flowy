import { useState, FormEvent } from 'react';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AppDialogContent, AppDialogHeader, AppDialogEyebrow,
  AppDialogBody, AppDialogSection, AppDialogFooter,
} from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { changePassword } from '@/api/client';
import axios from 'axios';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ open, onClose }: Props) {
  const [current, setCurrent]         = useState('');
  const [next, setNext]               = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('');
    setShowCurrent(false); setShowNext(false);
    setError(''); setLoading(false); setDone(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (next !== confirm) { setError('New passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword(current, next);
      setDone(true);
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <AppDialogContent className="sm:max-w-[400px]">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Change password</DialogTitle>
          <DialogDescription className="sr-only">Change your Flowy hub password.</DialogDescription>
          <AppDialogEyebrow>
            <KeyRound className="h-3 w-3" />
            Security
          </AppDialogEyebrow>
          <div className="hidden sm:block">
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Change password</h2>
          </div>
        </AppDialogHeader>

        {done ? (
          <>
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <p className="py-2 text-[13px] text-foreground/80">
                  Password updated successfully. All other sessions have been signed out.
                </p>
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter>
              <Button onClick={handleClose} className="rounded-full px-4 text-[11px]">Done</Button>
            </AppDialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="neutral">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                      Current password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? 'text' : 'password'}
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        placeholder="Enter current password"
                        className="pr-10"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNext ? 'text' : 'password'}
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        placeholder="At least 8 characters"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNext((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                      Confirm new password
                    </Label>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>

                  {error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              </AppDialogSection>
            </AppDialogBody>

            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button
                  type="button" variant="ghost"
                  onClick={handleClose}
                  className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !current || !next || !confirm}
                  className="rounded-full px-4 text-[11px]"
                >
                  {loading ? 'Saving…' : 'Update password'}
                  {!loading && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
