import { useState } from 'react';
import { Runner, AiProvider } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';

const AI_LABELS: Record<AiProvider, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
};

export default function AssignTaskModal({
  taskKey, runners, onSubmit, onClose,
}: {
  taskKey: string;
  runners: Runner[];
  onSubmit: (data: { runnerId: string; aiProvider: string }) => void;
  onClose: () => void;
}) {
  const [runnerId, setRunnerId] = useState('');
  const [aiProvider, setAiProvider] = useState('');

  const selectedRunner = runners.find((r) => r.id === runnerId);
  const availableProviders: AiProvider[] = selectedRunner
    ? JSON.parse(selectedRunner.ai_providers || '[]')
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runnerId || !aiProvider) return;
    onSubmit({ runnerId, aiProvider });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">Assign {taskKey}</DialogTitle>
          <DialogDescription className="text-[13px]">Select a runner and AI provider to execute this task.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Runner</Label>
            <Select value={runnerId || undefined} onValueChange={(v) => { setRunnerId(v); setAiProvider(''); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a runner..." /></SelectTrigger>
              <SelectContent>
                {runners.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.status})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRunner && (
              <div className="flex items-center gap-2 pt-1">
                <RunnerStatusBadge status={selectedRunner.status} />
                {selectedRunner.device_info && (
                  <span className="text-[11px] text-muted-foreground/50">{selectedRunner.device_info}</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">AI Provider</Label>
            <Select value={aiProvider || undefined} onValueChange={setAiProvider} disabled={!runnerId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select AI provider..." /></SelectTrigger>
              <SelectContent>
                {availableProviders.map((p) => (
                  <SelectItem key={p} value={p}>{AI_LABELS[p]}</SelectItem>
                ))}
                {availableProviders.length === 0 && runnerId && (
                  <div className="px-3 py-2 text-[13px] text-muted-foreground/50">No providers available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!runnerId || !aiProvider}>Assign</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
