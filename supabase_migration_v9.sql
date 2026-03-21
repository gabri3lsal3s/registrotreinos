-- Migration V9: Adicionando propriedades de "Tipo de Exercício"
-- category: 'weight', 'bodyweight' ou 'time'
-- multiplier: Fator multiplicador para peso corporal (K)
-- time_in_seconds: Registrado em workout_sets para exercícios de tempo

ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'weight',
ADD COLUMN IF NOT EXISTS multiplier numeric(5,2);

ALTER TABLE public.workout_sets
ADD COLUMN IF NOT EXISTS time_in_seconds integer;

-- Index if necessary for fast lookups on sets
CREATE INDEX IF NOT EXISTS idx_workout_sets_time 
ON public.workout_sets(time_in_seconds);
