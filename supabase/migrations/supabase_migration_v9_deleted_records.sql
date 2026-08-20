-- Migration v9: Tabela de deleted_records para propagação de exclusões multi-dispositivos
CREATE TABLE IF NOT EXISTS public.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_user_date ON public.deleted_records(user_id, deleted_at DESC);

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'deleted_records' 
      AND policyname = 'deleted_records_user_isolation'
  ) THEN
    CREATE POLICY "deleted_records_user_isolation"
      ON public.deleted_records
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
