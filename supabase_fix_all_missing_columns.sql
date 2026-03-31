-- SCRIPT DEFINITIVO DE CORREÇÃO DE ESQUEMA (SUPABASE)
-- Execute este script INTEGRALMENTE no SQL Editor do seu projeto Supabase.
-- Ele garante que todas as colunas necessárias existam para o sincronismo funcionar.


-- 1. CRIAÇÃO DA TABELA 'workouts' SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  protocol_id uuid NOT NULL,
  date timestamptz NOT NULL,
  status TEXT DEFAULT 'active',
  finished_at TIMESTAMPTZ,
  mood INTEGER,
  sleep_quality INTEGER,
  stress_level INTEGER,
  recovery TEXT,
  notes TEXT,
  is_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CORREÇÕES NA TABELA 'workouts' (garante colunas status e finished_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='status') THEN
    ALTER TABLE workouts ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='finished_at') THEN
    ALTER TABLE workouts ADD COLUMN finished_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. CORREÇÕES NA TABELA 'exercises'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='last_reps') THEN
    ALTER TABLE exercises ADD COLUMN last_reps INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='sets') THEN
    ALTER TABLE exercises ADD COLUMN sets INTEGER DEFAULT 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='reps') THEN
    ALTER TABLE exercises ADD COLUMN reps INTEGER DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='day_of_week') THEN
    ALTER TABLE exercises ADD COLUMN day_of_week TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_session_only') THEN
    ALTER TABLE exercises ADD COLUMN is_session_only BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='updated_at') THEN
    ALTER TABLE protocols ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;


DO $$
DECLARE
  v_column RECORD;
BEGIN
  FOR v_column IN SELECT column_name FROM information_schema.columns WHERE table_name='workouts' AND data_type='bigint' LOOP
    EXECUTE format('ALTER TABLE workouts ALTER COLUMN %I TYPE timestamptz USING to_timestamp(%I / 1000.0)', v_column.column_name, v_column.column_name);
  END LOOP;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='completed') THEN
    ALTER TABLE workout_sets ADD COLUMN completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;


DO $$
DECLARE
  v_column RECORD;
BEGIN
  FOR v_column IN SELECT column_name FROM information_schema.columns WHERE table_name='workout_sets' AND data_type='bigint' LOOP
    EXECUTE format('ALTER TABLE workout_sets ALTER COLUMN %I TYPE timestamptz USING to_timestamp(%I / 1000.0)', v_column.column_name, v_column.column_name);
  END LOOP;
END $$;


-- 8. GARANTE COLUNAS PRINCIPAIS EM 'workout_sets'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='workout_id') THEN
    ALTER TABLE workout_sets ADD COLUMN workout_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='exercise_id') THEN
    ALTER TABLE workout_sets ADD COLUMN exercise_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='weight') THEN
    ALTER TABLE workout_sets ADD COLUMN weight NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='reps') THEN
    ALTER TABLE workout_sets ADD COLUMN reps INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='id') THEN
    ALTER TABLE workout_sets ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='timestamp') THEN
    ALTER TABLE workout_sets ADD COLUMN timestamp timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='user_id') THEN
    ALTER TABLE workout_sets ADD COLUMN user_id uuid;
  END IF;
END $$;
