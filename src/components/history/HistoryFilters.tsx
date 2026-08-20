import { Search, Filter, Dumbbell, Scale, Layers } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { Protocol } from '../../types';

interface HistoryFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  typeFilter: 'all' | 'workout' | 'weight';
  onTypeFilterChange: (val: 'all' | 'workout' | 'weight') => void;
  selectedProtocolId: string;
  onProtocolChange: (val: string) => void;
  protocols: Protocol[];
}

export function HistoryFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  selectedProtocolId,
  onProtocolChange,
  protocols
}: HistoryFiltersProps) {
  return (
    <div className="space-y-3 bg-card/60 p-4 rounded-2xl border border-border/50">
      {/* Busca Textual */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por protocolo ou exercício..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-background border-border/50 font-medium"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Filtro por Tipo (Pílulas) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/30">
          <Button
            type="button"
            variant={typeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTypeFilterChange('all')}
            className={`flex-1 sm:flex-none h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
              typeFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todos
          </Button>

          <Button
            type="button"
            variant={typeFilter === 'workout' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTypeFilterChange('workout')}
            className={`flex-1 sm:flex-none h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
              typeFilter === 'workout'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Treinos
          </Button>

          <Button
            type="button"
            variant={typeFilter === 'weight' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTypeFilterChange('weight')}
            className={`flex-1 sm:flex-none h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
              typeFilter === 'weight'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Pesagens
          </Button>
        </div>

        {/* Filtro por Protocolo */}
        {typeFilter !== 'weight' && protocols.length > 0 && (
          <div className="w-full sm:w-56">
            <Select value={selectedProtocolId} onValueChange={onProtocolChange}>
              <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 text-xs font-bold">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Filtrar por Protocolo" />
                </div>
              </SelectTrigger>
              <SelectContent className="text-xs font-bold">
                <SelectItem value="all">Todos os Protocolos</SelectItem>
                {protocols.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
