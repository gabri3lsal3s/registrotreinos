-- Adicionando suporte a soft-delete (arquivamento)
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Criando índices para performance nas consultas filtradas
CREATE INDEX IF NOT EXISTS idx_protocols_is_archived ON protocols(is_archived);
CREATE INDEX IF NOT EXISTS idx_exercises_is_archived ON exercises(is_archived);
