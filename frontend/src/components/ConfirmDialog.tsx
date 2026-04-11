import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection } from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AppDialogContent className="sm:max-w-[420px]">
        <AppDialogHeader tone="danger">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
          <AppDialogEyebrow tone="danger">
            <AlertTriangle className="h-3 w-3" />
            Confirm action
          </AppDialogEyebrow>
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">{title}</h2>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground/85">{description}</p>
          </div>
        </AppDialogHeader>
        <div className="px-6 py-4">
          <AppDialogSection tone="danger">
            <p className="text-[12px] leading-5 text-muted-foreground/90">This action is permanent and cannot be undone.</p>
          </AppDialogSection>
        </div>
        <AppDialogFooter>
          <div className="text-[11px] text-muted-foreground/80">Review carefully before continuing.</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">Cancel</Button>
            <Button variant="destructive" onClick={onConfirm} className="rounded-full px-4 text-[11px]">{confirmLabel}</Button>
          </div>
        </AppDialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
