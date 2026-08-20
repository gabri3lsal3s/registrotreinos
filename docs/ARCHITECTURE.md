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
2. **Ciclo PUSH -> PULL**:
   - `syncData()`: Executa o PUSH de itens com `isSynced === false` para o Supabase e, após confirmação com status `200`, marca `isSynced: true` localmente.
   - `pullData()`: Realiza o PULL de dados remotos para o IndexedDB sem sobrescrever modificações locais não sincronizadas (`!local || local.isSynced`).
3. **Escopo por Usuário (`userId`)**: Todas as queries e mutations no Dexie e no Supabase são isoladas por `userId` do usuário autenticado no `useAuthStore`.
4. **Resiliência a Falhas de Rede**: Em caso de falha de conexão ou CORS, a sincronização é abortada de forma não-bloqueante (`console.warn`), mantendo a integridade da UI.

---

## 2. Estrutura do Esquema IndexedDB (Dexie `WorkoutDB`)

O banco local `WorkoutDB` versão 3 possui as seguintes tabelas tipadas:

```ts
db.version(3).stores({
  protocols: 'id, userId, name, isEnabled, isSynced',
  exercises: 'id, userId, protocolId, name, order, muscleGroup, isSynced',
  workouts: 'id, userId, protocolId, date, dateKey, isSynced',
  workoutSets: 'id, userId, workoutId, exerciseId, setIndex, dateKey, isSynced',
  bodyWeights: 'id, userId, date, dateKey, isSynced'
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

