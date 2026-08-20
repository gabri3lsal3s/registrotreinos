-- MIGAÇÃO PARA ADICIONAR CAMPOS DE HABILITAÇÃO E DIAS DA SEMANA AOS PROTOCOLOS
-- Execute no SQL Editor do Supabase

DO $$ 
BEGIN 
  -- 1. Adicionar coluna is_enabled se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='is_enabled') THEN
    ALTER TABLE protocols ADD COLUMN is_enabled BOOLEAN DEFAULT FALSE;
  END IF;

  -- 2. Adicionar coluna days_of_week se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='days_of_week') THEN
    ALTER TABLE protocols ADD COLUMN days_of_week TEXT[] DEFAULT '{}';
  END IF;
END $$;
