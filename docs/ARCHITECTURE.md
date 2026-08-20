# 🏛️ Arquitetura Técnica & Decisões de Engenharia

O **Registro de Treinos** segue uma arquitetura **Offline-First Absoluta**, garantindo disponibilidade instantânea e integridade total de dados mesmo sem conexão de rede.

---

## 1. Topologia de Dados e Sincronização

```
[ Usuário ] 
     │
     ▼ (Leitura e Gravação Instantânea)
[ Dexie.js (IndexedDB) ]  <─── Fonte Primária da Verdade (Offline-First)
     │
     ▼ (Sincronização em Background não-bloqueante)
[ SyncService (syncService.ts) ]
     │
     ▼ (Isolamento estrito por user_id via RLS)
[ Supabase PostgreSQL ]
```

### Regras Mandatórias de Sincronização:
1. **Gravação Local com Flag**: Toda operação do usuário (treinos, protocolos, séries, pesagens) é gravada diretamente no Dexie.js com `isSynced: false`.
2. **Fila de Tombstones com Hierarquia Reversa de Integridade**:
   - Exclusões geram um registro em `pendingDeletions` (`table, recordId, userId`).
   - O processamento de tombstones (`flushPendingDeletions`) segue rigorosamente a ordem inversa de dependência de chaves estrangeiras:
     1. `workout_sets` (filho de workouts e exercises)
     2. `workouts` (filho de protocols)
     3. `exercises` (filho de protocols)
     4. `protocols` (pai)
     5. `body_weights` (independente)
   - Ao deletar remotamente, registra o tombstone na tabela Supabase `deleted_records (user_id, table_name, record_id, deleted_at)` para propagação entre dispositivos.
3. **Ciclo PUSH -> PULL com Web Locks & Chunking**:
   - `fullSync()` valida/renova a sessão Supabase e solicita a trava de sistema `'workout_sync_mutex'` (Web Locks API) com fallback em memória.
   - `syncData()`: Despacha tombstones, particiona payloads massivos em lotes de até 100 registros (`batchUpsert`), pré-valida e envia entidades ancestrais (protocolos e treinos pais) e marca `isSynced: true` progressivamente tabela por tabela conforme cada lote é confirmado pelo servidor.
   - `pullData()`: Realiza o PULL de dados remotos para o IndexedDB sem sobrescrever modificações locais não sincronizadas (`!local || local.isSynced`), lê a tabela remota `deleted_records` para expurgar exclusões confirmadas no Dexie local e filtra registros marcados para exclusão.
4. **Auto-Healing de Esquema & Resiliência a Desvios de Schema Remoto**:
   - Em caso de incompatibilidades de colunas no PostgREST (ex: colunas ausentes em instâncias com migrações parciais), o `batchUpsert` detecta os erros em tempo real, expurga dinamicamente as colunas incompatíveis do lote na memória e retenta o envio sem abortar a sincronização.
   - Preenchimento canônico obrigatório de `date_key` (`YYYY-MM-DD`) e fallbacks inteligentes de integridade referencial para `protocol_id` e `exercise_id`.
5. **Auto-Retry com Exponential Backoff & Jitter**: Tolerância a micro-quedas de sinal com até 3 retentativas progressivas automáticas.
6. **Background Heartbeat Sync**: Temporizador em segundo plano ativo a cada 3 minutos para salvaguarda contínua de treinos longos.

---

## 2. Estrutura do Esquema IndexedDB (Dexie `WorkoutDB`)

O banco local `WorkoutDB` versão 8 possui as seguintes tabelas e índices:

```ts
db.version(8).stores({
  protocols: 'id, userId, name, isEnabled, isSynced, [userId+isEnabled], [userId+isSynced]',
  exercises: 'id, userId, protocolId, name, order, isSynced, [protocolId+isSynced]',
  workouts: 'id, userId, protocolId, date, status, isSynced, [userId+protocolId+status], [userId+status], [userId+isSynced]',
  workoutSets: 'id, userId, workoutId, exerciseId, setIndex, isSynced, [workoutId+exerciseId], [workoutId+exerciseId+setIndex], [workoutId+isSynced]',
  bodyWeights: 'id, userId, date, isSynced, [userId+date], [userId+isSynced]',
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

