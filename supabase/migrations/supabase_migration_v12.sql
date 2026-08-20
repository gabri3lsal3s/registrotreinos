-- Migration V12: Adiciona coluna is_session_only para exercícios extras em sessão
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_session_only') THEN
    ALTER TABLE exercises ADD COLUMN is_session_only BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_exercises_is_session_only ON exercises(is_session_only);
  END IF;
END $$;
