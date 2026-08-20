import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Layout, PageHeader } from '../components/common';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Moon, 
  RefreshCw, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Database, 
  Cloud, 
  CloudCheck, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  HardDrive,
  Vibrate,
  Volume2,
  Dumbbell,
  Settings as SettingsIcon
} from "lucide-react";
import { 
  getSensorySettings, 
  saveSensorySettings, 
  triggerHaptic, 
  playAudioCue 
} from '../utils/sensoryFeedback';
import { 
  exportBackupJSON, 
  exportWorkoutHistoryCSV, 
  importBackupJSON, 
  getPendingSyncCounts, 
  type PendingSyncCounts 
} from '../services/backupService';
import { fullSync } from '../services/syncService';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, logout, syncStatus } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [sensorySettings, setSensorySettingsState] = useState(() => getSensorySettings());

  const handleToggleHaptics = (val: boolean) => {
    const updated = saveSensorySettings({ hapticsEnabled: val });
    setSensorySettingsState(updated);
    if (val) {
      triggerHaptic('success');
    }
  };

  const handleToggleSound = (val: boolean) => {
    const updated = saveSensorySettings({ soundEnabled: val });
    setSensorySettingsState(updated);
    if (val) {
      playAudioCue('set_complete');
    }
  };

  const [pendingCounts, setPendingCounts] = useState<PendingSyncCounts>({
    protocols: 0,
    exercises: 0,
    workouts: 0,
    workoutSets: 0,
    bodyWeights: 0,
    total: 0
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSyncStatus = useCallback(async () => {
    if (!user) return;
    try {
      const counts = await getPendingSyncCounts(user.id);
      setPendingCounts(counts);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus, syncStatus]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await fullSync();
      await loadSyncStatus();
      toast.success('Sincronização concluída!');
    } catch (err) {
      console.error(err);
      toast.error('Erro durante a sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportJSON = async () => {
    if (!user) return;
    try {
      await exportBackupJSON(user.id);
      toast.success('Backup JSON exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar backup JSON.');
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;
    try {
      await exportWorkoutHistoryCSV(user.id);
      toast.success('Histórico CSV exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar histórico CSV.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPendingFileContent(content);
      setImportDialogOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingFileContent || !user) return;
    try {
      const { importedCount } = await importBackupJSON(pendingFileContent, user.id, importMode);
      toast.success(`${importedCount} itens restaurados com sucesso!`);
      setPendingFileContent(null);
      await loadSyncStatus();
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na importação.';
      toast.error(msg);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <PageHeader 
          title="Configurações" 
          description="Gerencie preferências, backups, sincronização e soberania de dados."
          icon={<SettingsIcon className="w-5 h-5 text-primary" />}
        />

        {/* 1. Interface & Visual */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Aparência
          </h3>

          <Card className="border-border/50 bg-card rounded-2xl shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground leading-tight">
                    Modo Escuro OLED
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    Preto absoluto (Pitch-Black #000000) otimizado para telas OLED e economia de bateria
                  </p>
                </div>
              </div>

              <Switch 
                checked={isDarkMode} 
                onCheckedChange={(val) => setIsDarkMode(val)} 
              />
            </CardContent>
          </Card>
        </section>

        {/* 2. Microinterações & Feedback Sensorial */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <Vibrate className="w-3.5 h-3.5 text-primary" />
            Feedback Sensorial & Áudio
          </h3>

          <Card className="border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden divide-y divide-border/30">
            {/* Vibração Háptica */}
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Vibrate className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground leading-tight">
                    Vibração Háptica
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    Feedback tátil ao marcar séries, ajustar cargas e cronômetro
                  </p>
                </div>
              </div>

              <Switch 
                checked={sensorySettings.hapticsEnabled} 
                onCheckedChange={handleToggleHaptics} 
              />
            </CardContent>

            {/* Efeitos Sonoros */}
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground leading-tight">
                    Efeitos Sonoros de Interface
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    Bipes suaves e tons sintéticos para séries, PRs e descanso
                  </p>
                </div>
              </div>

              <Switch 
                checked={sensorySettings.soundEnabled} 
                onCheckedChange={handleToggleSound} 
              />
            </CardContent>
          </Card>
        </section>

        {/* 2. Sincronização & Nuvem */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <Cloud className="w-3.5 h-3.5 text-primary" />
            Sincronização & Nuvem
          </h3>

          <Card className="border-border/50 bg-card rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isOnline ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    <CloudCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground leading-tight">
                        {isOnline ? 'Conectado à Nuvem' : 'Modo Offline (Gravando Localmente)'}
                      </h4>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary' : 'bg-amber-500'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {pendingCounts.total === 0
                        ? 'Todos os registros locais estão sincronizados com segurança.'
                        : `${pendingCounts.total} registro(s) aguardando sincronização.`}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleForceSync}
                  disabled={isSyncing || !isOnline}
                  className="h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 border-border/60"
                >
                  <RefreshCw className={`w-4 h-4 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </Button>
              </div>

              {/* Status Detalhado por Tabela */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/30 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Protocolos</span>
                  <span className="font-mono font-bold text-foreground">
                    {pendingCounts.protocols === 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-primary inline mr-1" /> : null}
                    {pendingCounts.protocols === 0 ? 'Sincronizado' : `${pendingCounts.protocols} pendentes`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Treinos & Séries</span>
                  <span className="font-mono font-bold text-foreground">
                    {pendingCounts.workouts + pendingCounts.workoutSets === 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-primary inline mr-1" /> : null}
                    {pendingCounts.workouts + pendingCounts.workoutSets === 0 ? 'Sincronizado' : `${pendingCounts.workouts + pendingCounts.workoutSets} pendentes`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Exercícios</span>
                  <span className="font-mono font-bold text-foreground">
                    {pendingCounts.exercises === 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-primary inline mr-1" /> : null}
                    {pendingCounts.exercises === 0 ? 'Sincronizado' : `${pendingCounts.exercises} pendentes`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pesagens</span>
                  <span className="font-mono font-bold text-foreground">
                    {pendingCounts.bodyWeights === 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-primary inline mr-1" /> : null}
                    {pendingCounts.bodyWeights === 0 ? 'Sincronizado' : `${pendingCounts.bodyWeights} pendentes`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Soberania de Dados & Backups */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            Soberania de Dados & Backups
          </h3>

          <Card className="border-border/50 bg-card rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Exportar JSON */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                      <Database className="w-4 h-4 text-primary" />
                      Backup Completo (JSON)
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Snapshot estruturado de todas as tabelas para salvaguarda total.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportJSON}
                    className="h-10 w-full rounded-xl font-bold text-xs uppercase tracking-wider border-border/60"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Baixar Backup JSON
                  </Button>
                </div>

                {/* Exportar CSV */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      Planilha de Treinos (CSV)
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Tabela formatada com todas as séries, cargas e volumes para Excel / Sheets.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportCSV}
                    className="h-10 w-full rounded-xl font-bold text-xs uppercase tracking-wider border-border/60"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Baixar Planilha CSV
                  </Button>
                </div>
              </div>

              {/* Restaurar Backup */}
              <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                    <Upload className="w-4 h-4 text-primary" />
                    Restaurar Dados de Backup
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Selecione um arquivo `.json` gerado anteriormente para restaurar sua conta.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setImportMode('merge');
                      fileInputRef.current?.click();
                    }}
                    className="h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground shadow-sm shadow-primary/20 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Carregar JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. Conta & Sessão */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Conta & Sessão
          </h3>

          <Card className="border-border/50 bg-card rounded-2xl shadow-sm">
            <CardContent className="p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Usuário Autenticado</span>
                <span className="font-mono font-bold text-sm text-foreground">{user?.email}</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setLogoutDialogOpen(true)}
                className="h-11 px-5 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto"
              >
                <LogOut className="w-4 h-4" />
                Encerrar Sessão
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* 5. Sobre o Aplicativo & Identidade Visual */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
            <Dumbbell className="w-3.5 h-3.5 text-primary" />
            Sobre o Aplicativo
          </h3>

          <Card className="border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm uppercase tracking-wider text-foreground truncate">
                    Registro de Treinos
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold uppercase">
                    PWA Standalone
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Rastreamento de hipertrofia, sobrecarga progressiva e biofeedback 100% offline-first.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground font-bold uppercase">
                  <span>Versão 1.8.0</span>
                  <span>•</span>
                  <span>Paleta Zinc & Emerald</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Rodapé / Versão */}
        <div className="text-center pt-2 opacity-40 space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Registro de Treinos PWA</p>
          <p className="text-[9px] font-mono">Offline First • Build v1.8.0</p>
        </div>

        {/* Diálogos de Confirmação */}
        <ConfirmDialog
          open={logoutDialogOpen}
          onOpenChange={setLogoutDialogOpen}
          title="Encerrar sessão?"
          description="Deseja realmente sair da sua conta? Todos os dados locais sincronizados permanecerão salvos na nuvem."
          confirmLabel="Sair da Conta"
          variant="destructive"
          onConfirm={logout}
        />

        <ConfirmDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          title="Restaurar backup JSON?"
          description={
            importMode === 'merge'
              ? 'Os dados do arquivo JSON serão mesclados com a sua base de dados atual.'
              : 'ATENÇÃO: A base de dados local atual deste usuário será substituída pelos dados do arquivo JSON.'
          }
          confirmLabel={importMode === 'merge' ? 'Mesclar Dados' : 'Substituir Tudo'}
          variant={importMode === 'replace' ? 'destructive' : 'default'}
          onConfirm={handleConfirmImport}
        />
      </div>
    </Layout>
  );
}
