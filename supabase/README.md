# 🗄️ Guia de Inicialização do Banco Supabase

Este guia contém as instruções passo a passo para inicializar ou recriar a infraestrutura de banco de dados do **Registro de Treinos** em um novo projeto Supabase.

---

## 🚀 Passo a Passo no Supabase

### 1. Criar o Projeto no Supabase
1. Acesse [database.new](https://database.new) e crie um novo projeto.
2. Defina uma senha forte para o banco de dados e selecione a região mais próxima (ex: `sa-east-1` / São Paulo).

### 2. Executar o Schema SQL Consolidado
1. No painel do seu projeto Supabase, acesse a aba lateral **SQL Editor**.
2. Clique em **New Query**.
3. Copie e cole todo o conteúdo do arquivo [`supabase/schema.sql`](./schema.sql).
4. Clique no botão **Run** (Executar).
5. Certifique-se de que a mensagem de retorno seja `Success. No rows returned`.

---

## 📋 O que o script cria:

| Tabela | Função | RLS / Segurança |
| :--- | :--- | :---: |
| **`protocols`** | Fichas e divisões de treino dos usuários | Isolamento por `auth.uid() = user_id` ✅ |
| **`exercises`** | Exercícios cadastrados nas fichas | Isolamento por `auth.uid() = user_id` ✅ |
| **`workouts`** | Sessões de treino concluídas | Isolamento por `auth.uid() = user_id` ✅ |
| **`workout_sets`** | Séries granulares com tipos (N, W, F, T, D) e notas | Isolamento por `auth.uid() = user_id` ✅ |
| **`body_weights`** | Pesagens corporais do usuário | Isolamento por `auth.uid() = user_id` ✅ |

### Recursos de Performance & Integridade:
- **Triggers automáticos**: Atualizam a coluna `updated_at` a cada modificação de registro.
- **Índices B-Tree compostos**: Otimizados para sincronização rápida e filtros por `user_id` e `date_key`.
- **Chaves Estrangeiras em Cascata (`ON DELETE CASCADE`)**: Garantem exclusão limpa de treinos e fichas sem deixar registros órfãos.

---

## 🔑 3. Configurar as Variáveis de Ambiente no App
No painel do Supabase, acesse **Project Settings > API** e copie os valores para o arquivo `.env.local` na raiz do seu projeto local:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_PUBLIC_KEY
```
