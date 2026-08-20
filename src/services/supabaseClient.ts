import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
  throw new Error('[Config] VITE_SUPABASE_URL não definida. Configure o arquivo .env com sua URL do Supabase.')
}
if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error('[Config] VITE_SUPABASE_ANON_KEY não definida. Configure o arquivo .env com sua chave anônima do Supabase.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => {
      // Executa diretamente para evitar conflito de Navigator LockManager entre abas
      return await fn();
    }
  }
});
