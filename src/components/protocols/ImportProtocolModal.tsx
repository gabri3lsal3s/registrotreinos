import React, { useState, useRef } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Dumbbell,
  CalendarDays,
  FileSpreadsheet,
  FileCode2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { WEEK_DAYS } from '../../utils/constants';
import { 
  parseUniversalProtocolInput, 
  type ParsedProtocolData, 
  type ParsedExerciseItem 
} from '../../services/universalProtocolParser';
import { saveImportedProtocol } from '../../services/protocolTransferService';
import { ExercisePickerModal } from './ExercisePickerModal';
import type { ExerciseCategory } from '../../types';

interface ImportProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (protocolId: string) => void;
  userId: string;
  existingProtocolNames?: string[];
}

const SAMPLE_MARKDOWN = `| Dia | Exercício | Séries | Repetições |
| Segunda | Supino Reto com Barra | 4 | 8-10 |
| Segunda | Supino Inclinado com Halteres | 3 | 10-12 |
| Segunda | Crucifixo na Polia | 3 | 12-15 |
| Segunda | Tríceps Corda | 4 | 12 |
| Terça | Puxada Frontal | 4 | 10 |
| Terça | Remada Curvada com Barra | 3 | 8-10 |
| Terça | Remada Baixa Triângulo | 3 | 12 |
| Terça | Rosca Direta Barra W | 4 | 10 |
| Quarta | Agachamento Livre | 4 | 8 |
| Quarta | Leg Press 45 | 3 | 10-12 |
| Quarta | Cadeira Extensora | 3 | 15 |
| Quarta | Mesa Flexora | 3 | 12 |
| Quarta | Panturrilha em Pé | 4 | 15 |`;

const SAMPLE_TEXT_AI = `Treino A - Peito e Tríceps (Segunda):
- Supino Reto: 4x10
- Supino Inclinado Halteres: 3x12
- Voador Peitoral: 3x15
- Tríceps Testa: 4x10
- Tríceps Pulley: 3x12

Treino B - Costas e Bíceps (Terça):
- Puxada Frontal: 4x10
- Remada Curvada: 4x8
- Serrote Unilateral: 3x10
- Rosca Direta: 4x10
- Rosca Martelo: 3x12

Treino C - Pernas e Ombros (Quinta):
- Agachamento Livre: 4x8
- Leg Press 45: 3x10
- Cadeira Extensora: 3x12
- Desenvolvimento Halteres: 4x10
- Elevação Lateral: 4x15`;

const SAMPLE_CSV = `Dia;Exercicio;Series;Reps;Grupo
Segunda;Supino Reto com Barra;4;8-10;Peito
Segunda;Desenvolvimento Halteres;3;10;Ombros
Segunda;Triceps Corda;3;12;Triceps
Terca;Puxada Frontal;4;10;Costas
Terca;Remada Curvada;3;8;Costas
Terca;Rosca Direta;3;10;Biceps`;

export function ImportProtocolModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  existingProtocolNames = []
}: ImportProtocolModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [inputTab, setInputTab] = useState<'file' | 'paste'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Preview States
  const [parsedData, setParsedData] = useState<ParsedProtocolData | null>(null);
  const [protocolName, setProtocolName] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [activeDays, setActiveDays] = useState<string[]>(['mon']);
  const [selectedDay, setSelectedDay] = useState('mon');
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, ParsedExerciseItem[]>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setStep('input');
    setInputTab('file');
    setRawText('');
    setFileName(null);
    setParsedData(null);
    setProtocolName('');
    setIsEnabled(true);
    setActiveDays(['mon']);
    setSelectedDay('mon');
    setExercisesByDay({});
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleProcessInput = (content: string, nameHint?: string) => {
    try {
      const parsed = parseUniversalProtocolInput(content);
      
      let initialName = nameHint ? nameHint.replace(/\.[^/.]+$/, '') : parsed.name;
      if (existingProtocolNames.some(n => n.toLowerCase() === initialName.toLowerCase())) {
        initialName = `${initialName} (Importado)`;
      }

      setParsedData(parsed);
      setProtocolName(initialName);
      setActiveDays(parsed.daysOfWeek);
      setSelectedDay(parsed.daysOfWeek[0] || 'mon');
      setExercisesByDay(parsed.exercisesByDay);
      setStep('preview');
      toast.success(`${parsed.totalExercises} exercício(s) identificados com sucesso!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar conteúdo.';
      toast.error(msg);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. O tamanho máximo permitido é 2MB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessInput(content, file.name);
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleDay = (dayKey: string) => {
    setActiveDays((prev) => {
      const exists = prev.includes(dayKey);
      if (exists && prev.length === 1) {
        toast.error('O protocolo deve ter pelo menos um dia ativo.');
        return prev;
      }
      const next = exists ? prev.filter(d => d !== dayKey) : [...prev, dayKey];
      const sorted = next.sort((a, b) => {
        const idxA = WEEK_DAYS.findIndex(d => d.key === a);
        const idxB = WEEK_DAYS.findIndex(d => d.key === b);
        return idxA - idxB;
      });
      if (!sorted.includes(selectedDay)) {
        setSelectedDay(sorted[0] || 'mon');
      }
      return sorted;
    });
  };

  const handleUpdateExercise = (day: string, index: number, field: keyof ParsedExerciseItem, value: string | number) => {
    setExercisesByDay(prev => {
      const dayList = [...(prev[day] || [])];
      if (!dayList[index]) return prev;
      dayList[index] = { ...dayList[index], [field]: value };
      return { ...prev, [day]: dayList };
    });
  };

  const handleRemoveExercise = (day: string, index: number) => {
    setExercisesByDay(prev => {
      const dayList = [...(prev[day] || [])];
      dayList.splice(index, 1);
      return { ...prev, [day]: dayList };
    });
  };

  const handleAddExerciseToDay = (exercise: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => {
    setExercisesByDay(prev => ({
      ...prev,
      [selectedDay]: [
        ...(prev[selectedDay] || []),
        {
          id: crypto.randomUUID(),
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          category: exercise.category,
          multiplier: exercise.multiplier,
          sets: 3,
          reps: 10,
          dayKey: selectedDay,
          dayLabel: WEEK_DAYS.find(w => w.key === selectedDay)?.label || 'Segunda-feira'
        }
      ]
    }));
  };

  const handleConfirmSave = async () => {
    if (!protocolName.trim()) {
      toast.error('Informe o nome do protocolo.');
      return;
    }

    const totalExs = activeDays.reduce((acc, d) => acc + (exercisesByDay[d]?.length || 0), 0);
    if (totalExs === 0) {
      toast.error('Adicione pelo menos um exercício nos dias selecionados.');
      return;
    }

    setIsSaving(true);
    try {
      const preparedData: ParsedProtocolData = {
        name: protocolName.trim(),
        daysOfWeek: activeDays,
        exercisesByDay,
        totalExercises: totalExs,
        sourceType: parsedData?.sourceType || 'text-ai',
        warnings: []
      };

      const createdId = await saveImportedProtocol(preparedData, userId, protocolName.trim(), isEnabled);
      toast.success(`Protocolo "${protocolName.trim()}" importado com sucesso!`);
      resetModal();
      onSuccess(createdId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar protocolo importado.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const currentDayExercises = exercisesByDay[selectedDay] || [];
  const nameAlreadyExists = existingProtocolNames.some(n => n.toLowerCase() === protocolName.trim().toLowerCase());

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col w-[95vw] sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] sm:max-h-[85vh] p-0 rounded-2xl sm:rounded-3xl bg-card border border-border/70 shadow-2xl overflow-hidden">
          {/* Header Fixo */}
          <DialogHeader className="px-5 py-4 sm:px-6 sm:py-4 border-b border-border/40 bg-card shrink-0">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                {step === 'preview' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Revisar & Confirmar Importação
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-primary" />
                    Importar Protocolo de Treino
                  </>
                )}
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {step === 'preview' 
                ? (fileName ? `Arquivo: ${fileName} • Revise os dados e confirme a gravação.` : 'Verifique os exercícios identificados, ajuste os dias e confirme a gravação.')
                : 'Importe arquivos JSON, planilhas CSV/TSV ou cole tabelas e textos gerados por IA.'}
            </p>
          </DialogHeader>

          {/* Corpo Rolável */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
            {step === 'input' ? (
              <div className="space-y-4">
                {/* Selector de Abas de Entrada */}
                <div className="flex p-1 bg-muted/40 rounded-xl border border-border/40 gap-1">
                  <button
                    type="button"
                    onClick={() => setInputTab('file')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      inputTab === 'file'
                        ? 'bg-card text-foreground shadow-sm border border-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    Upload de Arquivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('paste')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      inputTab === 'paste'
                        ? 'bg-card text-foreground shadow-sm border border-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-primary" />
                    Colar Texto / Tabela IA
                  </button>
                </div>

                {inputTab === 'file' ? (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.csv,.tsv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/70 hover:border-primary/60 bg-muted/10 hover:bg-primary/5 rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">
                          Clique para escolher o arquivo
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                          Suporta arquivos <span className="font-mono text-primary font-bold">.JSON</span> (app/backups), <span className="font-mono text-primary font-bold">.CSV</span>, <span className="font-mono text-primary font-bold">.TSV</span> ou <span className="font-mono text-primary font-bold">.TXT</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-10 px-5 font-bold text-xs uppercase tracking-wider border-border/60 mt-1 pointer-events-none"
                      >
                        Selecionar do Dispositivo
                      </Button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground space-y-1">
                      <p className="font-bold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <FileCode2 className="w-3.5 h-3.5 text-primary" />
                        Compatibilidade Universal
                      </p>
                      <p className="leading-relaxed">
                        Você pode importar protocolos exportados deste app, tabelas do Excel/Google Sheets ou arquivos gerados por outros aplicativos de treino.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                          Cole a Tabela ou Texto do Treino
                        </label>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Markdown, CSV ou Lista Livre
                        </span>
                      </div>
                      <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Ex: Cole aqui a tabela de treino do ChatGPT ou planilha..."
                        rows={7}
                        className="w-full rounded-2xl bg-background border border-border/60 p-3.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                      />
                    </div>

                    {/* Botões de Modelos Rápidos de IA */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Exemplos prontos para testar:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRawText(SAMPLE_MARKDOWN)}
                          className="h-8 text-[11px] rounded-lg border-border/50 font-medium"
                        >
                          Tabela Markdown
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRawText(SAMPLE_TEXT_AI)}
                          className="h-8 text-[11px] rounded-lg border-border/50 font-medium"
                        >
                          Lista Treinos A/B/C (IA)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRawText(SAMPLE_CSV)}
                          className="h-8 text-[11px] rounded-lg border-border/50 font-medium"
                        >
                          Formato CSV
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleProcessInput(rawText)}
                      disabled={!rawText.trim()}
                      className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground shadow-sm shadow-primary/20 flex items-center justify-center gap-2 mt-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Analisar e Pré-visualizar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* FASE 2: PREVIEW & AJUSTES */
              <div className="space-y-4">
                {/* 1. Nome e Switch de Ativação */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Nome do Protocolo
                      </label>
                      <Input
                        type="text"
                        value={protocolName}
                        onChange={(e) => setProtocolName(e.target.value)}
                        placeholder="Ex: Treino ABC Hipertrofia"
                        className="h-10 rounded-xl bg-background border-border/60 font-bold text-sm"
                      />
                      {nameAlreadyExists && (
                        <span className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Já existe um protocolo com este nome. Recomendamos diferenciar.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-border/30">
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          Ativar Agora
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Disponível para treino
                        </span>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Seleção de Dias da Semana */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      Dias da Semana Ativos
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono font-bold">
                      {activeDays.length} dia(s) selecionado(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {WEEK_DAYS.map((d) => {
                      const isActive = activeDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => handleToggleDay(d.key)}
                          className={`h-9 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                              : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Navegação por Dias Ativos & Lista de Exercícios */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1">
                      {activeDays.map((dKey) => {
                        const dayObj = WEEK_DAYS.find(w => w.key === dKey);
                        const count = exercisesByDay[dKey]?.length || 0;
                        const isSelected = selectedDay === dKey;
                        return (
                          <button
                            key={dKey}
                            type="button"
                            onClick={() => setSelectedDay(dKey)}
                            className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                              isSelected
                                ? 'bg-foreground text-background shadow-sm'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <span>{dayObj?.label || dKey}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isSelected ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                      className="h-8 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border-border/60 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-primary" />
                      Exercício
                    </Button>
                  </div>

                  {/* Lista de Exercícios do Dia Selecionado */}
                  <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
                    {currentDayExercises.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-border/40 bg-muted/10 space-y-2">
                        <Dumbbell className="w-6 h-6 text-muted-foreground/50 mx-auto" />
                        <p className="text-xs text-muted-foreground font-medium">
                          Nenhum exercício atribuído para este dia.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPickerOpen(true)}
                          className="text-primary font-bold text-xs h-8"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Adicionar Exercício
                        </Button>
                      </div>
                    ) : (
                      currentDayExercises.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 sm:p-3.5 rounded-xl border border-border/40 bg-card hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <Input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateExercise(selectedDay, idx, 'name', e.target.value)}
                              className="h-8 px-2 rounded-lg bg-background border-border/40 text-xs font-bold text-foreground"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-bold uppercase tracking-wider text-primary">
                                {item.muscleGroup}
                              </span>
                              <span>•</span>
                              <span>{item.category === 'bodyweight' ? 'Peso Corporal' : item.category === 'time' ? 'Tempo' : 'Carga Convencional'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border/30">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Séries:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={item.sets}
                                  onChange={(e) => handleUpdateExercise(selectedDay, idx, 'sets', parseInt(e.target.value) || 1)}
                                  className="w-8 text-center text-xs font-bold bg-transparent text-foreground focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border/30">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Reps:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={item.reps}
                                  onChange={(e) => handleUpdateExercise(selectedDay, idx, 'reps', parseInt(e.target.value) || 1)}
                                  className="w-9 text-center text-xs font-bold bg-transparent text-foreground focus:outline-none"
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExercise(selectedDay, idx)}
                              className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Fixo */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-border/40 bg-muted/20 flex flex-row items-center justify-between gap-3 shrink-0">
            {step === 'preview' ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('input')}
                  className="rounded-xl font-bold uppercase text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="rounded-xl font-bold uppercase text-xs h-10 px-4"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="rounded-xl font-black uppercase text-xs h-10 px-5 bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  >
                    {isSaving ? 'Salvando...' : 'Confirmar Importação'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="rounded-xl font-bold uppercase text-xs h-10 px-5"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Seletor de Exercício para Adição Rápida */}
      <ExercisePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExerciseToDay}
      />
    </>
  );
}
