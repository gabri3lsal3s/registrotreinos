-- ==============================================================================
-- REGISTRO DE TREINOS - SCHEMA CONSOLIDADO COMPLETO (SUPABASE POSTGRESQL)
-- Versão: 1.9.0-CONSOLIDATED
-- Descrição: Criação de tabelas, índices de alta performance, RLS e triggers.
-- ==============================================================================

-- 1. Extensões Essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Função de Gatilho para Atualização Automática de 'updated_at'
-- ==============================================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Tabela: PROTOCOLS (Planilhas / Fichas de Treino)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  days_of_week JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.protocols IS 'Protocolos e divisões de treino dos usuários';

-- Trigger updated_at para protocols
DROP TRIGGER IF EXISTS tr_protocols_updated_at ON public.protocols;
CREATE TRIGGER tr_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ==============================================================================
-- 4. Tabela: EXERCISES (Exercícios dos Protocolos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  muscle_group TEXT NOT NULL DEFAULT 'Outros',
  category TEXT NOT NULL DEFAULT 'weight', -- 'weight' | 'bodyweight' | 'time'
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  day TEXT NOT NULL DEFAULT 'Segunda',
  sets INT NOT NULL DEFAULT 3,
  reps INT NOT NULL DEFAULT 10,
  last_weight NUMERIC DEFAULT 0,
  last_reps INT DEFAULT 0,
  is_session_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.exercises IS 'Exercícios vinculados aos protocolos de treino';

-- Trigger updated_at para exercises
DROP TRIGGER IF EXISTS tr_exercises_updated_at ON public.exercises;
CREATE TRIGGER tr_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ==============================================================================
-- 5. Tabela: WORKOUTS (Sessões de Treino Realizadas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.protocols(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_key TEXT NOT NULL, -- Ex: '2026-08-20'
  duration INT DEFAULT 0, -- Duração em segundos
  mood TEXT,              -- 'great' | 'good' | 'tired' | 'bad'
  rpe NUMERIC,            -- Percepção Subjetiva de Esforço (1 a 10)
  notes TEXT,             -- Observações gerais do treino
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workouts IS 'Histórico de sessões de treinos executadas';

-- Trigger updated_at para workouts
DROP TRIGGER IF EXISTS tr_workouts_updated_at ON public.workouts;
CREATE TRIGGER tr_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ==============================================================================
-- 6. Tabela: WORKOUT_SETS (Séries Executadas em Cada Sessão)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  set_index INT NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'normal', -- 'normal' | 'warmup' | 'feeder' | 'top' | 'drop'
  notes TEXT,                          -- Anotações específicas da série (ex: 'drop set 30%')
  rpe NUMERIC,                         -- RPE individual da série
  time_in_seconds INT,                 -- Duração para exercícios isométricos/cardio
  date_key TEXT NOT NULL,              -- Ex: '2026-08-20'
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workout_sets IS 'Registro granular de séries, cargas, repetições e tipos de série';

-- Trigger updated_at para workout_sets
DROP TRIGGER IF EXISTS tr_workout_sets_updated_at ON public.workout_sets;
CREATE TRIGGER tr_workout_sets_updated_at
  BEFORE UPDATE ON public.workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ==============================================================================
-- 7. Tabela: BODY_WEIGHTS (Acompanhamento de Peso Corporal)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_key TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.body_weights IS 'Registros de pesagem corporal e evolução de massa';

-- Trigger updated_at para body_weights
DROP TRIGGER IF EXISTS tr_body_weights_updated_at ON public.body_weights;
CREATE TRIGGER tr_body_weights_updated_at
  BEFORE UPDATE ON public.body_weights
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ==============================================================================
-- 8. Índices de Alta Performance (B-Tree) para Otimização de Consultas
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_protocols_user ON public.protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_protocols_user_enabled ON public.protocols(user_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_exercises_user ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_protocol ON public.exercises(protocol_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_protocol ON public.exercises(user_id, protocol_id);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON public.exercises(muscle_group);

CREATE INDEX IF NOT EXISTS idx_workouts_user ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_datekey ON public.workouts(user_id, date_key);

CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON public.workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON public.workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON public.workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_datekey ON public.workout_sets(user_id, date_key);

CREATE INDEX IF NOT EXISTS idx_body_weights_user ON public.body_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_body_weights_user_date ON public.body_weights(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_weights_user_datekey ON public.body_weights(user_id, date_key);

-- ==============================================================================
-- 9. Row Level Security (RLS) - Isolamento Estrito Multi-Usuário
-- ==============================================================================
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weights ENABLE ROW LEVEL SECURITY;

-- Políticas para: PROTOCOLS
CREATE POLICY "protocols_user_isolation"
  ON public.protocols
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para: EXERCISES
CREATE POLICY "exercises_user_isolation"
  ON public.exercises
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para: WORKOUTS
CREATE POLICY "workouts_user_isolation"
  ON public.workouts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para: WORKOUT_SETS
CREATE POLICY "workout_sets_user_isolation"
  ON public.workout_sets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para: BODY_WEIGHTS
CREATE POLICY "body_weights_user_isolation"
  ON public.body_weights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- FIM DO SCHEMA CONSOLIDADO
-- ==============================================================================
