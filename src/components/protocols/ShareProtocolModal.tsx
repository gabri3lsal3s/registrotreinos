import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Copy, Check, Share2, Dumbbell } from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';
import { toast } from 'sonner';
import type { ProtocolWithExercises } from '../../types';

interface ShareProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocol: ProtocolWithExercises | null;
}

export function ShareProtocolModal({
  isOpen,
  onClose,
  protocol
}: ShareProtocolModalProps) {
  const [copied, setCopied] = useState(false);

  // Gerar link de compartilhamento serializado
  const shareUrl = useMemo(() => {
    if (!protocol) return '';
    try {
      const payload = {
        n: protocol.name,
        d: protocol.description || '',
        w: protocol.daysOfWeek || ['mon'],
        e: (protocol.exercises || []).map((ex) => ({
          n: ex.name.replace(/\s*\([^)]*\)$/, '').trim(),
          m: ex.muscleGroup,
          c: ex.category || 'weight',
          s: ex.sets || 3,
          r: ex.reps || 10,
          w: ex.dayOfWeek,
          p: ex.pinnedNotes
        }))
      };

      const jsonStr = JSON.stringify(payload);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const baseUrl = window.location.origin;
      return `${baseUrl}/protocols?import_data=${base64}`;
    } catch (err) {
      console.error('Erro ao gerar link:', err);
      return window.location.href;
    }
  }, [protocol]);

  const handleCopyLink = async () => {
    triggerHaptic('success');
    playAudioCue('click');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link de importação copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Erro ao copiar link.');
    }
  };

  const handleNativeShare = async () => {
    if (!protocol) return;
    triggerHaptic('medium');
    playAudioCue('click');

    const text = `📋 Confira meu protocolo de treino "${protocol.name}" no Registro de Treinos!\n\nAcesse e importe com 1 clique:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Protocolo: ${protocol.name}`,
          text: text,
          url: shareUrl
        });
        return;
      } catch {
        // Fallback
      }
    }
    handleCopyLink();
  };

  if (!protocol) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[94vw] p-5 sm:p-6 rounded-3xl bg-card border-border/70 shadow-2xl overflow-hidden">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground truncate">
                Compartilhar Protocolo
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium truncate">
                Envie <strong>{protocol.name}</strong> para amigos ou outros aparelhos
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-3">
          {/* Card Resumo do Protocolo */}
          <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-sm text-foreground truncate">
                  {protocol.name}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                {protocol.exercises?.length || 0} exercícios
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {protocol.description || 'Protocolo pronto para importação descentralizada e 100% offline.'}
            </p>
          </div>

          {/* QR Code Placeholder / Visual Banner */}
          <div className="p-5 rounded-2xl bg-muted/15 border border-border/40 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-20 h-20 rounded-2xl bg-background border border-border/60 flex items-center justify-center shadow-inner">
              <QrCode className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">
                Link Descentralizado URL-Safe
              </span>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Contém todos os exercícios, séries e regulagens codificados na própria URL.
              </p>
            </div>
          </div>

          {/* Campo de Link */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Link de Importação Direta
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="h-11 font-mono text-xs rounded-xl bg-background border-border/60 text-muted-foreground select-all truncate"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="h-11 px-3.5 rounded-xl border-border/60 font-bold shrink-0"
                title="Copiar Link"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border-border/60 font-bold"
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleNativeShare}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar via WhatsApp / App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
