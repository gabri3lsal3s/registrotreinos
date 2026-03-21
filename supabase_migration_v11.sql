-- SCRIPT DE CORREÇÃO DE ESQUEMA - V11
-- Este script garante que todas as colunas necessárias para o sincronismo existam no Supabase.

-- 1. Tabela 'exercises'
DO $$
BEGIN
  -- Coluna is_archived
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_archived') THEN
    ALTER TABLE exercises ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_exercises_is_archived ON exercises(is_archived);
  END IF;

  -- Coluna category
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='category') THEN
    ALTER TABLE exercises ADD COLUMN category TEXT DEFAULT 'weight';
  END IF;

  -- Coluna multiplier
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='multiplier') THEN
    ALTER TABLE exercises ADD COLUMN multiplier NUMERIC(5,2);
  END IF;

  -- Coluna muscle_group
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='muscle_group') THEN
    ALTER TABLE exercises ADD COLUMN muscle_group TEXT;
  END IF;

  -- Coluna last_reps (garantindo)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='last_reps') THEN
    ALTER TABLE exercises ADD COLUMN last_reps INTEGER DEFAULT 0;
  END IF;
END $$;


-- 2. Tabela 'protocols'
DO $$
BEGIN
  -- Coluna is_archived
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='is_archived') THEN
    ALTER TABLE protocols ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_protocols_is_archived ON protocols(is_archived);
  END IF;

  -- Coluna is_enabled (caso falte)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='is_enabled') THEN
    ALTER TABLE protocols ADD COLUMN is_enabled BOOLEAN DEFAULT TRUE;
  END IF;

  -- Coluna days_of_week (caso falte)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='days_of_week') THEN
    ALTER TABLE protocols ADD COLUMN days_of_week TEXT[] DEFAULT '{}';
  END IF;
END $$;


-- 3. Tabela 'workout_sets'
DO $$
BEGIN
  -- Coluna time_in_seconds
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='time_in_seconds') THEN
    ALTER TABLE workout_sets ADD COLUMN time_in_seconds INTEGER;
    CREATE INDEX IF NOT EXISTS idx_workout_sets_time ON workout_sets(time_in_seconds);
  END IF;

  -- Coluna rpe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='rpe') THEN
    ALTER TABLE workout_sets ADD COLUMN rpe INTEGER;
  END IF;
END $$;
