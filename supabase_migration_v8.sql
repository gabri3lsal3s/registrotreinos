-- Migration V8: Criação da tabela de registro de Peso Corporal (BodyWeights)

CREATE TABLE IF NOT EXISTS public.body_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight numeric(5,2) NOT NULL,
  date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.body_weights ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para body_weights (Apenas o próprio usuário pode ver/editar/deletar)
CREATE POLICY "Users can view their own body weights"
  ON public.body_weights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body weights"
  ON public.body_weights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body weights"
  ON public.body_weights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body weights"
  ON public.body_weights FOR DELETE
  USING (auth.uid() = user_id);

-- Índices essenciais para velocidade nas consultas da aba Análise
CREATE INDEX idx_body_weights_user_date ON public.body_weights(user_id, date);

-- Function to handle timestamp triggers automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_body_weights_modtime
  BEFORE UPDATE ON public.body_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
