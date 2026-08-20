-- MIGRAÇÃO PARA ADICIONAR COLUNA UPDATED_AT AOS PROTOCOLOS
-- Serve para garantir a ordenação estável por última interação

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='protocols' AND column_name='updated_at') THEN
    ALTER TABLE protocols ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
