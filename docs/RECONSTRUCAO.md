# Guia de Reconstrução e Especificação Funcional

Este documento consolida todas as regras de negócio, especificações e requisitos essenciais para a reconstrução, manutenção ou evolução do sistema **Registro de Treinos**.

> [!NOTE]
> Para o detalhamento completo dos cálculos, fórmulas e fluxos, consulte também [SPECIFICATION.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/SPECIFICATION.md) e [ARCHITECTURE.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/ARCHITECTURE.md).

---

## 1. Escopo Funcional do Sistema

1. **Gestão de Sessões de Treino**:
   - Criação de protocolos personalizados com dias específicos da semana atribuídos.
   - Adição e reordenação interativa de exercícios por protocolo (com suporte a drag-and-drop).
   - Suporte a 3 categorias de exercícios: Carga Tradicional (`weight`), Peso Corporal/Calistenia (`bodyweight`) e Isometria/Tempo (`time`).
2. **Execução de Treino em Tempo Real**:
   - Carregamento instantâneo do treino ativo sem dependência de internet.
   - Exibição de histórico anterior imediato para cada exercício ("Ant: Carga x Reps").
   - Registro série a série com salvamento reativo em IndexedDB.
   - Adição dinâmica de exercícios apenas para a sessão atual (`isSessionOnly`).
3. **Métricas de Performance & Análise Fisiológica**:
   - Volume total de carga ponderado por categoria.
   - Cálculo de 1RM estimado (fórmula de Epley) e Força Relativa ($\text{1RM} / \text{Peso Corporal}$).
   - Radar de distribuição de volume por grupo muscular e análise de assimetrias.
   - Acompanhamento da curva de peso corporal.
4. **Sincronização em Nuvem (Cloud Sync)**:
   - Sincronização delta bidirecional com Supabase (PostgreSQL + RLS).
   - Conversão transparente entre formatos de chave (camelCase no frontend e snake_case no PostgreSQL).
   - Resolução de conflitos baseada em carimbo de data/hora e flags `isSynced`.

---

## 2. Modelagem Entidade-Relacionamento

```mermaid
erDiagram
    USERS ||--o{ PROTOCOLS : "possui"
    USERS ||--o{ WORKOUTS : "executa"
    USERS ||--o{ BODY_WEIGHTS : "registra"
    PROTOCOLS ||--o{ EXERCISES : "contém"
    WORKOUTS ||--o{ WORKOUT_SETS : "possui"
    EXERCISES ||--o{ WORKOUT_SETS : "referenciado em"

    USERS {
        uuid id PK
        string email
        timestamptz created_at
    }

    PROTOCOLS {
        uuid id PK
        uuid user_id FK
        string name
        string description
        boolean is_enabled
        string[] days_of_week
        boolean is_archived
        timestamptz created_at
        timestamptz updated_at
    }

    EXERCISES {
        uuid id PK
        uuid protocol_id FK
        string name
        string muscle_group
        string category
        float multiplier
        int order
        int sets
        int reps
        boolean is_archived
        boolean is_session_only
    }

    WORKOUTS {
        uuid id PK
        uuid user_id FK
        uuid protocol_id FK
        timestamptz date
        string status
        timestamptz finished_at
        int mood
        int sleep_quality
        int stress_level
        string notes
    }

    WORKOUT_SETS {
        uuid id PK
        uuid workout_id FK
        uuid exercise_id FK
        int set_index
        float weight
        int reps
        int time_in_seconds
        int rpe
        boolean completed
        timestamptz timestamp
    }

    BODY_WEIGHTS {
        uuid id PK
        uuid user_id FK
        float weight
        timestamptz date
    }
```
