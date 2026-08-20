# 🧩 Catálogo de Componentes (DRY Architecture)

Este documento descreve os componentes da aplicação, seus contratos de props e organização modular em subpastas com barrel exports (`index.ts`).

---

## 1. Componentes Comuns (`src/components/common/`)

| Componente | Props Principais | Descrição e Comportamento |
| :--- | :--- | :--- |
| **`Layout`** | `{ children: ReactNode }` | Shell responsivo que provê **Sidebar Desktop lateral dedicada** (`w-64 fixed`) para telas `md:` e `lg:` e **Bottom Navigation Bar** fluida para telas móveis. Gerencia o status real de conectividade em tempo real. |
| **`PageHeader`** | `{ title: string, description?: string, action?: ReactNode }` | Cabeçalho unificado com título responsivo (`text-xl sm:text-2xl md:text-3xl`) e slot de ação adaptativo (`w-full sm:w-auto`). |
| **`MetricCard`** | `{ label, value, subValue?, progressPercent?, deltaPercent?, deltaLabel?, icon? }` | Card analítico com números grandes em `font-mono text-2xl sm:text-3xl`, barra de progresso e badge percentual de variação. |
| **`ConfirmDialog`** | `{ open, onOpenChange, title, description, confirmLabel, cancelLabel?, variant?, onConfirm }` | Modal acessível baseado em Radix UI com botões de 44px para confirmações críticas (exclusão, cancelamento, logout). Substitui `window.confirm`. |
| **`EmptyState`** | `{ icon?, title, description?, action? }` | Card com borda tracejada e ícone destacado para listas vazias de treinos, protocolos e histórico. |
| **`InfoTooltip`** | `{ title: string, content: string }` | Tooltip de auxílio com popover de alto contraste. |
| **`LoadingScreen`** | N/A | Spinner de tela cheia para carregamento inicial de sessão. |

---

## 2. Módulo de Execução de Treinos (`src/components/workout/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`WorkoutSetRow`** | `{ setIdx, setData, isCompleted, category?, onToggleSet, onUpdateSetData, onUpdateSetType? }` | **Componente DRY desacoplado** para linha de série. Layout responsivo com badge clicável de tipo de série (**N/W/F/T/D**), inputs de carga/reps `h-11`, botões de micro-incremento `-1/+1/+2` e botão de confirmação 44px. |
| **`WorkoutExerciseCard`** | `{ exercise, exIdx, isExpanded, onToggleExpand, onToggleSet, onUpdateSetData, onUpdateSetType?, onDeleteExtraExercise?, truePR? }` | Card expansível de exercício em treino ativo, com header clicável, progresso de séries, badge de PR e listagem de `WorkoutSetRow`. |
| **`FloatingRestTimer`** | `{ isOpen, initialSeconds, onClose }` | Timer flutuante de descanso com Web Audio API offline e vibração háptica ao término. |
| **`WorkoutDayTabs`** | `{ availableDays, currentDay, onSelectDay }` | Abas de alternância de dias da semana em treinos divididos. |
| **`ExerciseLibraryModal`** | `{ isOpen, onClose, library, onSelectExercise }` | Modal com catálogo de exercícios organizados por grupo muscular e busca em tempo real. |
| **`ConfigExtraExerciseModal`**| `{ isOpen, onClose, configEx, onChangeSets, onConfirm }` | Modal de ajuste de número de séries para exercício extra adicionado durante o treino ativo. |
| **`WorkoutFinishModal`** | `{ isOpen, onClose, onConfirm, totalSetsCompleted, totalVolumeKg, brokenPRs, isSubmitting }` | Modal de conclusão de treino com feedback de humor, avaliação de RPE, notas gerais e resumo de PRs batidos. |

---

## 3. Módulo de Protocolos e Fichas (`src/components/protocols/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`ProtocolCard`** | `{ protocol, exerciseCount, activeDaysCount, onStartWorkout, onEditProtocol, onDuplicateProtocol, onDeleteProtocol, onToggleEnabled }` | Card do protocolo com switch de ativação no dashboard, resumo de dias e ações rápidas com confirmação. |
| **`ProtocolBuilder`** | `{ protocolName, onChangeName, isEnabled, onToggleEnabled, activeDays, onToggleDay, selectedDay, onSelectDay, exercisesByDay, onUpdateExercise, onRemoveExercise, onAddExercise, onReorderExercises, onSave, onCancel, isSaving }` | Construtor de protocolos semanal com drag-and-drop (`@dnd-kit/sortable`), gestão de dias ativos e catálogo integrado. |
| **`DraggableExerciseCard`** | `{ ex, idx, day, onUpdate, onRemove }` | Card arrastável com alça touch `GripVertical`, selects de categoria/músculo e inputs de séries/reps/carga base. |
| **`ExercisePickerModal`** | `{ isOpen, onClose, onSelect }` | Catálogo de seleção de exercícios por grupo muscular. |

---

## 4. Módulo de Histórico (`src/components/history/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`HistoryFilters`** | `{ search, onSearchChange, typeFilter, onTypeFilterChange, selectedProtocolId, onProtocolChange, protocols }` | Barra de busca rápida, pílulas de filtro (Todos / Treinos / Pesagens) e seletor de protocolo. |
| **`HistoryWorkoutCard`** | `{ workout, protocolName, groupedSets, exercisesMap, isExpanded, onToggleExpand, onEditSet, onDeleteSet, onEditDate, onDeleteWorkout }` | Card de treino realizado com detalhamento de séries, volume total, edição granular e exclusão segura. |
| **`HistoryWeightCard`** | `{ entry, onDelete }` | Card de pesagem corporal individual. |
| **`EditSetModal`** | `{ isOpen, onClose, editingSet, exerciseName, onSave, isSaving }` | Modal de edição de peso, reps, tipo de série e notas de uma série histórica. |
| **`EditDateModal`** | `{ isOpen, onClose, currentIsoDate, onSave, isSaving }` | Modal de ajuste de data e horário de uma sessão retroativa. |

---

## 5. Módulo de Dashboard (`src/components/dashboard/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`TodayWorkoutHero`** | `{ todayWorkout, todayLabel, onStart, onNavigateProtocols }` | Hero card com botão de 1-toque para iniciar a sessão programada para o dia atual ou estado de descanso. |
| **`ActiveWorkoutBanner`** | `{ activeWorkout, onResume }` | Banner com pulso esmeralda para retomar sessão de treino em andamento. |
| **`ConsistencyGrid`** | `{ completedDayKeys, weeklyGoal }` | Grid visual dos 7 dias da semana mostrando dias cumpridos e meta semanal. |
| **`BodyWeightQuickCard`** | `{ latestWeight, onWeightLogged }` | Widget para registro rápido de peso corporal com suporte a decimais PT-BR. |
