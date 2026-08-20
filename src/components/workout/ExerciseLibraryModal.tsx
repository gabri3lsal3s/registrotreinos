import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Dumbbell, Plus } from 'lucide-react';
import type { ExerciseCategory, UniqueExercise } from '../../types';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: UniqueExercise[];
  onSelectExercise: (ex: { name: string; category?: ExerciseCategory; muscleGroup?: string; multiplier?: number }) => void;
}

export function ExerciseLibraryModal({
  isOpen,
  onClose,
  library,
  onSelectExercise
}: ExerciseLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLibrary = library.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (ex: UniqueExercise) => {
    onSelectExercise(ex);
  };

  const handleCreateCustom = () => {
    if (!searchQuery.trim()) return;
    onSelectExercise({
      name: searchQuery.trim(),
      category: 'weight'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Biblioteca de Exercícios
          </DialogTitle>
        </DialogHeader>

        {/* Barra de Busca */}
        <div className="relative mt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou músculo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-background border-border/50 font-medium"
            autoFocus
          />
        </div>

        {/* Lista de Exercícios */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-3 max-h-[50vh]">
          {filteredLibrary.length > 0 ? (
            filteredLibrary.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={() => handleSelect(ex)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 hover:border-primary/30 transition-all text-left group"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {ex.name}
                  </p>
                  {ex.muscleGroup && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      {ex.muscleGroup}
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum exercício encontrado para "{searchQuery}".
              </p>
              {searchQuery.trim() && (
                <Button
                  type="button"
                  onClick={handleCreateCustom}
                  className="rounded-xl h-11 px-4 font-bold text-xs uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar "{searchQuery.trim()}"
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
