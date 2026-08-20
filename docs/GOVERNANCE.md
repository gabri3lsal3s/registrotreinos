# Governança de Código e Manutenção da Documentação

## 1. Princípios de Governança

Para manter a base de código limpa, escalável, legível e pronta para colaboração entre desenvolvedores e agentes de Inteligência Artificial, este projeto estabelece regras mandatórias de engenharia de software e documentação técnica.

---

## 2. Convenções de Nomenclatura e Estrutura

### 2.1. Pastas e Diretórios
- **Padrão**: `kebab-case` para todas as pastas de código (ex: `components/common`, `components/ui`, `types`).
- **Exceção**: Pastas de documentação técnica seguem a nomenclatura canônica em minúsculas (`docs/`).

### 2.2. Componentes React
- **Padrão**: `PascalCase` para componentes React (ex: `Layout.tsx`, `PageHeader.tsx`, `ProtectedRoute.tsx`, `AuthPage.tsx`).
- **Arquivos de UI do Shadcn/Radix**: Podem seguir `kebab-case` ou `camelCase` conforme o ecossistema (`button.tsx`, `card.tsx`, `dialog.tsx`).
- **Exports**: Todo componente deve fornecer export nomeado explícito e export default compatível.

### 2.3. Hooks Customizados
- **Padrão**: `camelCase` iniciando obrigatoriamente com o prefixo `use` (ex: `useAuth.ts`, `useTheme.ts`, `useWorkout.ts`).

### 2.4. Serviços, Utilitários e Helpers
- **Padrão**: `camelCase` terminando com a função principal ou contexto (ex: `workoutDB.ts`, `syncService.ts`, `authService.ts`, `exportUtils.ts`, `exerciseDictionary.ts`).

### 2.5. Arquivos de Documentação Técnica
- **Padrão**: `UPPER_SNAKE_CASE.md` dentro do diretório `docs/` (ex: `docs/SPECIFICATION.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/COMPONENTS.md`, `docs/PWA_GUIDELINES.md`, `docs/ROADMAP.md`, `docs/GOVERNANCE.md`).
- **Exceção**: O índice geral `docs/README.md` e o `README.md` raiz.

---

## 3. A Regra da Documentação Viva (Living Documentation)

> [!IMPORTANT]
> **Nenhuma alteração arquitetural, contrato de banco de dados, nova rota ou novo componente estrutural pode ser mesclado sem a imediata atualização do seu respectivo arquivo em `docs/`.**

1. **Alterou o esquema do IndexedDB ou Supabase?**
   - Atualize `docs/ARCHITECTURE.md` e `docs/SPECIFICATION.md`.
   - Adicione o script de migração versionado em `supabase/migrations/`.
2. **Criou ou modificou um componente compartilhado?**
   - Atualize o catálogo e os contratos de props em `docs/COMPONENTS.md`.
3. **Adicionou tokens visuais, fontes ou temas?**
   - Registre as novas variáveis e regras em `docs/DESIGN_SYSTEM.md`.
4. **Completou uma tarefa ou iniciou uma nova fase?**
   - Atualize o status dos marcos em `docs/ROADMAP.md`.

---

## 4. Política de Limpeza Contínua (Zero-Garbage Policy)

1. **Proibição de Arquivos Órfãos na Raiz**:
   - A raiz do repositório é restrita a arquivos essenciais de configuração (`package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `components.json`, `index.html`, `vercel.json`, `.gitignore`, `.env`, `README.md`, e regras do editor).
   - Scripts de teste descartáveis, arquivos `.txt`, rascunhos ou logs jamais devem ser comitados na raiz.
2. **Eliminação de Código Morto e Duplicidades**:
   - Não manter arquivos duplicados em diretórios concorrentes (ex: componentes soltos em `src/components/` vs `src/components/common/`).
   - Imports não utilizados e variáveis não referenciadas devem ser removidos antes de qualquer commit.
   - A compilação do TypeScript (`npm run build`) deve passar sem alertas de tipagem estrita (`noUnusedLocals`).
