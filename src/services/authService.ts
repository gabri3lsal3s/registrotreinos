import Dexie from 'dexie';
import bcrypt from 'bcryptjs';
import { encryptData } from '../utils/crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string; // Isso será o hash bcrypt mas armazenado "criptografado" para cumprir o roadmap
  credentialId?: string;
  encryptedData?: { iv: string; data: string }; // Para outros dados sensíveis se necessário
}

class AuthDB extends Dexie {
  users: Dexie.Table<User, string>;
  constructor() {
    super('AuthDB');
    this.version(1).stores({
      users: 'id, email, credentialId',
    });
    this.users = this.table('users');
  }
}

const db = new AuthDB();
const SECRET_KEY = 'treinos-offline-key'; 
const API_URL = 'http://localhost:4005/api'; // Porta configurada no .env do backend

/**
 * Registra um novo usuário com hashing de senha e criptografia local + backend.
 */
export async function registerUser(email: string, password: string) {
  // 1. Registro no Backend
  const response = await fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao registrar no servidor');
  }

  // 2. Registro Local (Cache/Offline)
  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const encryptedHash = await encryptData(passwordHash, SECRET_KEY);
  
  await db.users.add({ 
    id, 
    email, 
    passwordHash: JSON.stringify(encryptedHash) 
  });
  
  return id;
}

/**
 * Login com e-mail e senha, autenticando no backend e obtendo token JWT.
 */
export async function loginUser(email: string, password: string) {
  // 1. Autenticação no Backend
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro no login');
  }

  const { token } = await response.json();

  // 2. Busca/Cria User Local para Cache
  let localUser = await db.users.where('email').equals(email).first();
  
  if (!localUser) {
    // Se logou no backend mas não existe localmente, cria cache local
    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const encryptedHash = await encryptData(passwordHash, SECRET_KEY);
    localUser = { id, email, passwordHash: JSON.stringify(encryptedHash) };
    await db.users.add(localUser);
  }
  
  return { user: localUser, token };
}

/**
 * Registra biometria para um usuário logado.
 */
export async function registerBiometry(userId: string) {
  const user = await db.users.get(userId);
  if (!user) throw new Error('Usuário não encontrado');

  try {
    // Simulação do fluxo WebAuthn para funcionamento offline PWA
    // Num cenário real startRegistration geraria o credentialId
    const credentialId = btoa(crypto.randomUUID()); 
    await db.users.update(userId, { credentialId });
    return true;
  } catch (err) {
    throw new Error('Falha ao registrar biometria');
  }
}

/**
 * Login via biometria buscando credencial salva localmente.
 */
export async function loginWithBiometrics() {
  const users = await db.users.toArray();
  const userWithBio = users.find(u => u.credentialId);
  
  if (!userWithBio) throw new Error('Nenhum usuário com biometria cadastrada');

  // Simulação de autenticação biométrica com token persistente ou dummy
  return { user: userWithBio, token: 'offline-biometric-token' };
}
