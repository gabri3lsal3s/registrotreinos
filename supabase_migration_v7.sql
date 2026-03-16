-- MIGRAÇÃO PARA ADICIONAR COLUNA DAY_OF_WEEK AOS EXERCÍCIOS
-- Torna a associação entre exercício e dia da semana muito mais robusta

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='day_of_week') THEN
    ALTER TABLE exercises ADD COLUMN day_of_week TEXT;
  END IF;
END $$;
