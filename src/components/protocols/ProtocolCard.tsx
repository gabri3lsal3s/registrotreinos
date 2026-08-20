import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { 
  Play, 
  Edit3, 
  Copy, 
  Trash2, 
  Dumbbell, 
  CalendarDays,
  Download
} from 'lucide-react';
import type { Protocol } from '../../types';

interface ProtocolCardProps {
  protocol: Protocol;
  exerciseCount: number;
  activeDaysCount: number;
  onStartWorkout: (protocolId: string) => void;
  onEditProtocol: (protocolId: string) => void;
  onDuplicateProtocol: (protocolId: string) => void;
  onExportProtocol: (protocolId: string) => void;
  onDeleteProtocol: (protocolId: string) => void;
  onToggleEnabled: (protocolId: string, enabled: boolean) => void;
}

export function ProtocolCard({
  protocol,
  exerciseCount,
  activeDaysCount,
  onStartWorkout,
  onEditProtocol,
  onDuplicateProtocol,
  onExportProtocol,
  onDeleteProtocol,
  onToggleEnabled
}: ProtocolCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  return (
    <>
      <Card className={`overflow-hidden border transition-all duration-200 ${
        protocol.isEnabled
          ? 'border-border/60 bg-card hover:border-primary/40 shadow-sm'
          : 'border-border/30 bg-card/50 opacity-75 hover:opacity-100'
      }`}>
        <CardContent className="p-5 flex flex-col justify-between gap-4">
          {/* Topo do Card: Nome e Switch de Ativação */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-black text-base sm:text-lg text-foreground truncate tracking-tight">
                  {protocol.name}
                </h3>
                {protocol.isEnabled && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    Ativo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
                  {activeDaysCount} {activeDaysCount === 1 ? 'dia' : 'dias'}
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5 text-muted-foreground/70" />
                  {exerciseCount} {exerciseCount === 1 ? 'exercício' : 'exercícios'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={!!protocol.isEnabled}
                onCheckedChange={(checked) => onToggleEnabled(protocol.id, checked)}
                title={protocol.isEnabled ? 'Desativar protocolo' : 'Ativar protocolo'}
              />
            </div>
          </div>

          {/* Rodapé do Card: Ações Rápidas */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditProtocol(protocol.id)}
                className="h-9 px-2.5 text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl"
                title="Editar Protocolo"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDuplicateDialogOpen(true)}
                className="h-9 px-2.5 text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl"
                title="Duplicar Protocolo"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Clonar
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onExportProtocol(protocol.id)}
                className="h-9 w-9 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded-xl"
                title="Exportar Protocolo (JSON)"
              >
                <Download className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-9 w-9 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                title="Excluir Protocolo"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => onStartWorkout(protocol.id)}
              className="h-10 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-primary text-primary-foreground shadow-sm shadow-primary/20 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir protocolo?"
        description={`Deseja excluir "${protocol.name}"? O histórico de treinos já realizados com este protocolo será preservado.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => onDeleteProtocol(protocol.id)}
      />

      {/* Confirmação de duplicação */}
      <ConfirmDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        title="Duplicar protocolo?"
        description={`Deseja criar uma cópia exata de "${protocol.name}" com todos os seus exercícios e dias configurados?`}
        confirmLabel="Clonar Protocolo"
        onConfirm={() => onDuplicateProtocol(protocol.id)}
      />
    </>
  );
}
