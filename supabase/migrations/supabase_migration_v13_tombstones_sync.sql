-- ==============================================================================
-- SUPABASE MIGRATION V13 - TOMBSTONES NATIVOS & DELTA SYNC ENGINE (v3.0)
-- Descrição: Adiciona colunas de soft-delete (is_deleted, deleted_at), garante triggers de updated_at
--            e cria índices compostos otimizados para Delta Fetch por timestamp.
-- ==============================================================================

-- 1. Garante Função de Gatilho para Atualização Automática de 'updated_at'
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabela: PROTOCOLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='description') THEN
    ALTER TABLE public.protocols ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='is_deleted') THEN
    ALTER TABLE public.protocols ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='deleted_at') THEN
    ALTER TABLE public.protocols ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='updated_at') THEN
    ALTER TABLE public.protocols ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

UPDATE public.protocols SET is_deleted = false WHERE is_deleted IS NULL;

DROP TRIGGER IF EXISTS tr_protocols_updated_at ON public.protocols;
CREATE TRIGGER tr_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_protocols_user_updated ON public.protocols(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_protocols_user_deleted ON public.protocols(user_id, is_deleted);


-- 3. Tabela: EXERCISES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_deleted') THEN
    ALTER TABLE public.exercises ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='deleted_at') THEN
    ALTER TABLE public.exercises ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='updated_at') THEN
    ALTER TABLE public.exercises ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

UPDATE public.exercises SET is_deleted = false WHERE is_deleted IS NULL;

DROP TRIGGER IF EXISTS tr_exercises_updated_at ON public.exercises;
CREATE TRIGGER tr_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_exercises_user_updated ON public.exercises(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_user_deleted ON public.exercises(user_id, is_deleted);


-- 4. Tabela: WORKOUTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_deleted') THEN
    ALTER TABLE public.workouts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='deleted_at') THEN
    ALTER TABLE public.workouts ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='updated_at') THEN
    ALTER TABLE public.workouts ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

UPDATE public.workouts SET is_deleted = false WHERE is_deleted IS NULL;

DROP TRIGGER IF EXISTS tr_workouts_updated_at ON public.workouts;
CREATE TRIGGER tr_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_workouts_user_updated ON public.workouts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_deleted ON public.workouts(user_id, is_deleted);


-- 5. Tabela: WORKOUT_SETS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='is_deleted') THEN
    ALTER TABLE public.workout_sets ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='deleted_at') THEN
    ALTER TABLE public.workout_sets ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_sets' AND column_name='updated_at') THEN
    ALTER TABLE public.workout_sets ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

UPDATE public.workout_sets SET is_deleted = false WHERE is_deleted IS NULL;

DROP TRIGGER IF EXISTS tr_workout_sets_updated_at ON public.workout_sets;
CREATE TRIGGER tr_workout_sets_updated_at
  BEFORE UPDATE ON public.workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_workout_sets_user_updated ON public.workout_sets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_deleted ON public.workout_sets(user_id, is_deleted);


-- 6. Tabela: BODY_WEIGHTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='body_weights' AND column_name='is_deleted') THEN
    ALTER TABLE public.body_weights ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='body_weights' AND column_name='deleted_at') THEN
    ALTER TABLE public.body_weights ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='body_weights' AND column_name='updated_at') THEN
    ALTER TABLE public.body_weights ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

UPDATE public.body_weights SET is_deleted = false WHERE is_deleted IS NULL;

DROP TRIGGER IF EXISTS tr_body_weights_updated_at ON public.body_weights;
CREATE TRIGGER tr_body_weights_updated_at
  BEFORE UPDATE ON public.body_weights
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_body_weights_user_updated ON public.body_weights(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_weights_user_deleted ON public.body_weights(user_id, is_deleted);
