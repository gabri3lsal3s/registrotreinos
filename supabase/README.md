# Migrações Supabase – Registro de Treinos

Este diretório contém os scripts SQL para provisionamento e atualização do esquema no Supabase PostgreSQL.

## Como Executar
1. Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2. Vá em **SQL Editor**.
3. Copie o conteúdo do arquivo SQL desejado em `migrations/` e clique em **Run**.

## Lista de Migrações
- `20260819_add_set_type_and_notes.sql`: Adiciona colunas `type` e `notes` à tabela `workout_sets`.
