import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
}

export const ADMIN_TEST_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@teste.com',
};

/**
 * Registra um novo usuário via Supabase Auth.
 */
export async function registerUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Erro ao criar usuário');

  return data.user.id;
}

/**
 * Login com e-mail e senha via Supabase Auth (com suporte para conta admin de teste).
 */
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Suporte à conta Administrador de Teste
  if (cleanEmail === 'admin@teste.com' && password === 'admin123') {
    return {
      user: ADMIN_TEST_USER,
      token: 'test-admin-token-mock-123456',
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw error;
  if (!data.user || !data.session) throw new Error('Credenciais inválidas');

  return { 
    user: { id: data.user.id, email: data.user.email || '' }, 
    token: data.session.access_token 
  };
}

/**
 * Login via biometria (WebAuthn) - Placeholder para integração futura.
 */
export async function loginWithBiometrics(): Promise<never> {
  throw new Error('Biometria em nuvem ainda não implementada com Supabase');
}

export async function registerBiometry(_userId?: string): Promise<boolean> {
  return true;
}
