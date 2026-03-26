import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
}

/**
 * Registra um novo usuário via Supabase Auth.
 */
export async function registerUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Erro ao criar usuário');

  return data.user.id;
}

/**
 * Login com e-mail e senha via Supabase Auth.
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user || !data.session) throw new Error('Credenciais inválidas');

  return { 
    user: { id: data.user.id, email: data.user.email! }, 
    token: data.session.access_token 
  };
}

/**
 * Login via biometria (WebAuthn) - Placeholder para integração futura se o Supabase suportar nativamente ou via helper.
 * Por enquanto mantemos a interface mas buscando do Supabase se possível.
 */
export async function loginWithBiometrics() {
  throw new Error('Biometria em nuvem ainda não implementada com Supabase');
}

export async function registerBiometry(_userId: string) {
  // Biometric registration placeholder
  return true;
}
