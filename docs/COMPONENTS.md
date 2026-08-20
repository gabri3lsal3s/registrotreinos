# 🧩 Catálogo de Componentes (DRY Architecture)

Este documento descreve os componentes da aplicação, seus contratos de props e organização modular em subpastas com barrel exports (`index.ts`).

---

## 1. Componentes Comuns (`src/components/common/`)

| Componente | Props Principais | Descrição e Comportamento |
| :--- | :--- | :--- |
| **`Layout`** | `{ children: ReactNode }` | Shell responsivo que provê **Sidebar Desktop lateral dedicada** (`w-64 fixed`) para telas `md:` e `lg:` e **Bottom Navigation Bar** fluida para telas móveis. Gerencia o status real de conectividade em tempo real. |
| **`PageHeader`** | `{ title: string, description?: ReactNode, icon?: ReactNode, badge?: ReactNode, action?: ReactNode }` | Cabeçalho unificado com ícone semântico destacado, badge de status opcional, título responsivo (`text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight`) e slot de ação adaptativo (`w-full sm:w-auto`). |
| **`MetricCard`** | `{ label, value, subValue?, progressPercent?, deltaPercent?, deltaLabel?, icon? }` | Card analítico com números grandes em `font-mono text-2xl sm:text-3xl`, barra de progresso e badge percentual de variação. |
| **`ConfirmDialog`** | `{ open, onOpenChange, title, description, confirmLabel, cancelLabel?, variant?, onConfirm }` | Modal acessível baseado em Radix UI com botões de 44px para confirmações críticas (exclusão, cancelamento, logout). Substitui `window.confirm`. |
| **`EmptyState`** | `{ icon?, title, description?, action? }` | Card com borda tracejada e ícone destacado para listas vazias de treinos, protocolos e histórico. |
| **`InfoTooltip`** | `{ title: string, content: string }` | Tooltip de auxílio com popover de alto contraste. |
| **`LoadingScreen`** | N/A | Spinner de tela cheia para carregamento inicial de sessão. |

---

## 2. Módulo de Execução de Treinos (`src/components/workout/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`WorkoutSetRow`** | `{ setIdx, setData, isCompleted, category?, onToggleSet, onUpdateSetData, onUpdateSetType?, onOpenPlateCalculator? }` | **Componente DRY desacoplado** para linha de série. Layout responsivo com badge clicável de tipo de série (**N/W/F/T/D**), inputs de carga/reps `h-11`, botões de micro-incremento `-1/+1/+2`, botão da Calculadora de Anilhas e botão de confirmação 44px. |
| **`WorkoutExerciseCard`** | `{ exercise, exIdx, isExpanded, userId?, onToggleExpand, onToggleSet, onUpdateSetData, onUpdateSetType?, onDeleteExtraExercise?, onUpdatePinnedNotes?, onOpenPlateCalculator?, truePR? }` | Card expansível de exercício em treino ativo, com header clicável, progresso de séries, badge de PR, notas fixas (*Pin Notes*), botão de consulta ao mini-histórico inline e listagem de `WorkoutSetRow`. |
| **`WorkoutBottomDock`** | `{ totalCompletedSets, onOpenFinishModal, defaultSeconds?, timerTrigger?, onTimerComplete? }` | **Dock de Ação Inferior Unificado**: integra o descanso permanente no rodapé (com presets rápidos de 1-toque `30s/45s/60s/90s/120s/180s`, botões de micro-ajuste `-15s/+30s`, `Iniciar/Pausar/Reiniciar`, Web Audio API e disparo automático ao concluir séries) e a barra de finalização com contador de séries. |
| **`FloatingRestTimer`** | `{ isOpen, initialSeconds, onClose }` | Timer flutuante avulso com presets rápidos de 1-toque, Web Audio API offline e vibração háptica ao término. |
| **`PlateCalculatorModal`** | `{ isOpen, onClose, initialWeight, onApplyWeight }` | **Calculadora Visual de Anilhas**: distribuição de carga por lado da barra com seleção de bases (Olímpica 20kg/15kg, Curva 8kg, Máquinas), representação esquemática colorida e botão de aplicação direta no set. |
| **`ExerciseHistoryModal`** | `{ isOpen, onClose, userId, exerciseName, muscleGroup?, truePR? }` | **Mini-Histórico Inline de Exercício**: consulta instantânea das últimas 5 sessões realizadas do exercício no salão de treino, exibindo 1RM estimado, volume total e detalhamento série a série. |
| **`WorkoutDayTabs`** | `{ availableDays, currentDay, onSelectDay }` | Abas de alternância de dias da semana em treinos divididos. |
| **`ExerciseLibraryModal`** | `{ isOpen, onClose, library, onSelectExercise }` | Modal com catálogo de exercícios organizados por grupo muscular e busca em tempo real. |
| **`ConfigExtraExerciseModal`**| `{ isOpen, onClose, configEx, onChangeSets, onConfirm }` | Modal de ajuste de número de séries para exercício extra adicionado durante o treino ativo. |
| **`SwapExerciseModal`** | `{ isOpen, onClose, currentExerciseName, muscleGroup?, category?, userLibrary?, onConfirmSwap }` | Modal de **substituição rápida de exercícios** com sugestões inteligentes do mesmo grupo muscular e categoria para equipamentos ocupados. |
| **`WorkoutFinishModal`** | `{ isOpen, onClose, onConfirm, totalSetsCompleted, totalVolumeKg, brokenPRs, isSubmitting }` | Modal de conclusão de treino com feedback de humor, avaliação de RPE, notas gerais e resumo de PRs batidos. |

---

## 3. Módulo de Protocolos e Fichas (`src/components/protocols/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`ProtocolCard`** | `{ protocol, exerciseCount, activeDaysCount, onStartWorkout, onEditProtocol, onDuplicateProtocol, onExportProtocol, onDeleteProtocol, onToggleEnabled }` | Card do protocolo com switch de ativação no dashboard, resumo de dias e ações rápidas (Iniciar, Editar, Clonar, Exportar JSON, Excluir). |
| **`ProtocolBuilder`** | `{ protocolName, onChangeName, isEnabled, onToggleEnabled, activeDays, onToggleDay, selectedDay, onSelectDay, exercisesByDay, onUpdateExercise, onRemoveExercise, onAddExercise, onReorderExercises, onSave, onCancel, isSaving }` | Construtor de protocolos semanal com drag-and-drop (`@dnd-kit/sortable`), gestão de dias ativos e catálogo integrado. |
| **`ImportProtocolModal`** | `{ isOpen, onClose, onSuccess, userId, existingProtocolNames? }` | Modal com abas de upload de arquivos (`.json`, `.csv`, `.tsv`, `.txt`) e colar texto/tabela de IA, permitindo pré-visualização, edição inline de exercícios e confirmação de importação atômica. |
| **`StarterPacksModal`** | `{ isOpen, onClose, userId, onSuccess }` | Galeria de templates consagrados de treino (**PPL 6x, Upper/Lower 4x, Full Body 3x**) com preview de divisão diária e adoção com 1-toque. |
| **`ShareProtocolModal`** | `{ isOpen, onClose, protocol }` | Modal de compartilhamento instantâneo de rotinas via link criptografado em Base64 / QR Code descentralizado. |
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

---

## 6. Módulo de Análises (`src/components/analysis/`)

| Componente | Props Principais | Descrição |
| :--- | :--- | :--- |
| **`ConsistencyHeatmap`** | `{ data, currentStreak, longestStreak }` | Mapa de calor anual de 52 semanas no padrão GitHub commits com tons de esmeralda e contadores de sequência de treinos. |
| **`AgonistAntagonistBalanceCard`** | `{ balanceData }` | Gráfico de radar e proporção de séries semanais entre grupos musculares antagônicos com diagnósticos posturais. |
