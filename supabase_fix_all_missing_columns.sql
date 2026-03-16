-- SCRIPT DEFINITIVO DE CORREÇÃO DE ESQUEMA (SUPABASE)
-- Execute este script INTEGRALMENTE no SQL Editor do seu projeto Supabase.
-- Ele garante que todas as colunas necessárias existam para o sincronismo funcionar.

DO $$ 
BEGIN 
  -- 1. CORREÇÕES NA TABELA 'exercises'
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

  -- 2. CORREÇÕES NA TABELA 'protocols'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='updated_at') THEN
    ALTER TABLE protocols ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

END $$;
