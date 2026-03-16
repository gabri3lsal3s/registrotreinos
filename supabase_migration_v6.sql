-- MIGRAÇÃO PARA ADICIONAR COLUNAS DE CONFIGURAÇÃO DE EXERCÍCIO
-- Permite salvar o número planejado de séries e repetições

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='sets') THEN
    ALTER TABLE exercises ADD COLUMN sets INTEGER DEFAULT 3;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='reps') THEN
    ALTER TABLE exercises ADD COLUMN reps INTEGER DEFAULT 10;
  END IF;
END $$;
