-- Migração: Adiciona tipo e anotações para séries de treino (workout_sets)
-- Executado no Supabase SQL Editor

ALTER TABLE public.workout_sets 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Índice opcional para consultas de tipo
CREATE INDEX IF NOT EXISTS idx_workout_sets_type ON public.workout_sets(type);
