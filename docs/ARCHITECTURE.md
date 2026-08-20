# 🏛️ Arquitetura Técnica & Decisões de Engenharia

O **Registro de Treinos** segue uma arquitetura **Offline-First Absoluta**, garantindo disponibilidade instantânea e integridade total de dados mesmo sem conexão de rede.

---

## 1. Topologia de Dados e Sincronização

```
[ Usuário ] 
     │
     ▼ (Leitura e Gravação Instantânea)
[ Dexie.js (IndexedDB) v9 ]  <─── Fonte Primária da Verdade (Offline-First)
     │                     ▲
     ▼ (Notificação)       │ (Reconciliação Delta LWW)
[ EventBus (syncEventBus) ]│
     │                     │
     ▼ (Auto-Atualização)  │
[ UI (Análises, Histórico) ]│
     │                     │
     ▼ (Push Topológico / Pull Incremental)
[ Sync Engine v3.0 (syncService.ts) ]
     │
     ▼ (Isolamento estrito por user_id via RLS)
[ Supabase PostgreSQL (Tombstones + Triggers updated_at) ]
```

### Regras Mandatórias de Sincronização (Sync Engine v3.0):
1. **Gravação Local com Soft-Delete & Flag**: Toda operação do usuário (treinos, protocolos, séries, pesagens) grava primeiro no Dexie com `isSynced: false`, `updatedAt: Date.now()`. Exclusões aplicam **Soft-Delete** (`isDeleted: true`, `deletedAt: Date.now()`, `isSynced: false`).
2. **Push Topológico em Cascata (Outbox Pattern)**:
   - O envio ao Supabase segue obrigatoriamente a ordem hierárquica das tabelas:
     1. `protocols` (pai)
     2. `exercises` (filho de protocols)
     3. `workouts` (filho de protocols)
     4. `workout_sets` (filho de workouts e exercises)
     5. `body_weights` (independente)
   - Exercícios avulsos ou recém-criados são garantidos antes das séries filhas, eliminando violações de Foreign Key no PostgreSQL.
3. **Pull Incremental (Delta Fetch com Cursor & Clock Skew Buffer)**:
   - O PULL consulta apenas registros onde `updated_at > (last_pulled_at - 5000ms)`, eliminando dumps completos e mitigando discrepâncias de relógio entre cliente e nuvem.
   - Aplica reconciliação determinística **Last-Write-Wins (LWW)** preservando edições locais não sincronizadas (`!local || local.isSynced || remoteUpdated >= localUpdated`).
4. **Tombstones Nativos em Todas as Camadas**:
   - Todas as 5 tabelas no Supabase e no Dexie possuem `is_deleted: boolean` e `deleted_at: timestamptz/numeric`.
   - As exclusões se propagam deterministicamente sem o risco de ressurreição em outros dispositivos.
5. **Barramento Reativo de Eventos (`syncEventBus` + `useDataReactivity`)**:
   - Mutações locais e conclusões de sincronização disparam eventos tipados que invalidam o cache e recalcula imediatamente gráficos, volume, 1RM e histórico sem necessidade de recarregar a página.
6. **Controle de Concorrência Multi-Aba (Web Locks API & Auth Lock Bypass)**:
   - O ciclo completo de sincronização obtém a trava `'workout_sync_mutex'` com `{ ifAvailable: true }`, evitando execuções redundantes entre abas abertas simultaneamente.
   - Cliente Supabase configurado com bypass de lock no refresh de token para prevenir `LockAcquireTimeoutError` em mobile e PWAs com múltiplas abas.
7. **Auto-Retry com Exponential Backoff & Jitter**: Tolerância a micro-quedas de sinal com até 3 retentativas progressivas automáticas.
8. **Background Heartbeat Sync**: Temporizador em segundo plano ativo a cada 3 minutos para salvaguarda contínua de treinos longos.
9. **Integridade de Chaves UUID RFC-4122 e Preservação de Vínculos**:
   - Validação canônica de 5 grupos (`8-4-4-4-12`) assegurando que `protocol_id` e `exercise_id` trafeguem intactos entre cliente e nuvem.
   - Reconciliação com salvaguarda local em caso de resposta remota omissa.
10. **Normalização Universal de Datas (`toTimestamp`)**:
    - Padronização em epoch ms para todas as comparações temporais no motor de análise e grade de consistência, mitigando discrepâncias entre strings ISO do PostgreSQL e números do IndexedDB.

---

## 2. Estrutura do Esquema IndexedDB (Dexie `WorkoutDB` v9)

O banco local `WorkoutDB` versão 9 possui as seguintes tabelas e índices:

```ts
db.version(9).stores({
  protocols: 'id, userId, name, isEnabled, isSynced, isDeleted, updatedAt, [userId+isEnabled], [userId+isSynced], [userId+isDeleted]',
  exercises: 'id, userId, protocolId, name, order, isSynced, isDeleted, updatedAt, [protocolId+isSynced], [protocolId+isDeleted], [userId+isDeleted]',
  workouts: 'id, userId, protocolId, date, status, isSynced, isDeleted, updatedAt, [userId+status], [userId+isSynced], [userId+isDeleted], [userId+date]',
  workoutSets: 'id, userId, workoutId, exerciseId, setIndex, isSynced, isDeleted, updatedAt, [workoutId+exerciseId], [workoutId+exerciseId+setIndex], [workoutId+isSynced], [workoutId+isDeleted], [userId+isDeleted]',
  bodyWeights: 'id, userId, date, isSynced, isDeleted, updatedAt, [userId+date], [userId+isSynced], [userId+isDeleted]',
  pendingDeletions: 'id, userId, table, recordId, timestamp, [userId+table]'
});
```

---

## 3. Divisão de Pacotes e Performance (Vite Code Splitting)

Para garantir carregamento ultrarrápido em redes móveis (3G/4G), o `vite.config.ts` divide as bibliotecas pesadas em *manual chunks*:

- **`vendor-charts`** (`recharts`): Carregado sob demanda na página de Análise.
- **`vendor-db`** (`dexie`, `@supabase/supabase-js`): Núcleo de banco e autenticação.
- **`vendor-dnd`** (`@dnd-kit/core`, `@dnd-kit/sortable`): Carregado no construtor de protocolos.
- **`vendor-icons`** (`lucide-react`): Conjunto otimizado de ícones do Design System.

---

## 4. Soberania de Dados e Backups (`src/services/backupService.ts`)

A soberania dos dados do usuário é garantida por meio de duas ferramentas nativas:
- **Backup Completo JSON (`exportBackupJSON`)**: Exporta snapshot criptograficamente consistente com metadados de versão (`version`, `exportedAt`, `totalRecords`).
- **Planilha CSV UTF-8 com BOM (`exportWorkoutHistoryCSV`)**: Exporta todas as sessões, séries, cargas, repetições e volumes em formato universal para Excel / Google Sheets.
- **Restauração Inteligente (`importBackupJSON`)**: Permite importar backups nos modos *Mesclar* (preserva dados locais existentes) ou *Substituir* (recria a base a partir do snapshot).

---

## 5. Transferência e Parsing Universal de Protocolos (`src/services/`)

1. **`protocolTransferService.ts`**:
   - **Exportação Granular (`exportProtocolJSON`)**: Gera arquivo JSON estruturado (`format: 'registrotreinos-protocol'`) contendo o protocolo e seus exercícios ativos, higienizando IDs e dados de usuário.
   - **Gravação Atômica (`saveImportedProtocol`)**: Persiste novo protocolo e exercícios no Dexie com transação `db.transaction`, gerando novos UUIDs e disparando sincronização em background.
2. **`universalProtocolParser.ts`**:
   - Analisador tolerante e adaptativo que suporta **JSON nativo/backups**, **planilhas CSV/TSV**, **tabelas Markdown** e **texto livre de IA** (ChatGPT/Claude/Gemini).
   - Auto-detecta delimitadores (`,`, `;`, `\t`, `|`), converte faixas numéricas (`4x8-12`), mapeia dias da semana (`mon`, `tue`, etc.) e categoriza exercícios via `exerciseDictionary.ts`.

