# Roadmap de Desenvolvimento – PWA Registro de Treinos

## 1. Visão Geral
Aplicação Web Progressiva (PWA) mobile-first com foco em rastreamento de hipertrofia, funcionamento 100% offline e autenticação. Visual minimalista premium na paleta **Zinc & Emerald**, com alto contraste para máxima legibilidade e foco em agilidade de registro.

---

## 2. Fases do Desenvolvimento

### Fase 1 – Setup Inicial [CONCLUÍDO]
- [x] Stack: React + Vite + TypeScript
- [x] Tailwind CSS (tema minimalista Zinc & Emerald)
- [x] PWA (manifest, service worker, cache offline)
- [x] Estruturação de pastas e organização do projeto

### Fase 2 – Autenticação e Usuários [CONCLUÍDO]
- [x] Tela de cadastro/login (email, senha)
- [x] Armazenamento seguro local (IndexedDB/LocalStorage)
- [x] Lógica de múltiplos usuários no mesmo dispositivo

### Fase 3 – Gestão de Protocolos e Execução [CONCLUÍDO]
- [x] CRUD de protocolos e exercícios (Páginas: Treinos e Montador)
- [x] Histórico rápido do último treino visível ("Ant: XXkg")
- [x] Modo de execução: check rápido para cada set e finalização de sessão
- [x] Home inteligente: exibe treino do dia ou resumo semanal
- [x] Exclusão de sessões registradas com segurança

### Fase 4 – Histórico e Análise [CONCLUÍDO]
- [x] **Histórico**: Visualização detalhada de sessões e exercícios passados
- [x] **Análise**: Gráficos de carga progressiva (Max e 1RM)
- [x] Simplificação: Remoção de Insights por IA em prol de dados brutos
- [x] **Volume Diário**: Gráfico de barras de carga total por dia

### Fase 5 – UI/UX Premium e Refinamento [CONCLUÍDO]
- [x] Tema White de alto contraste e Dark Mode robusto
- [x] Padronização de botões, cards e tipografia (Inter/Geist)
- [x] Localização completa para PT-BR
- [x] Responsividade mobile adaptada (remoção de scrollbars globais)
- [x] Microinterações e animações de feedback premium

### Fase 6 – Sincronização e Soberania de Dados [CONCLUÍDO]
- [x] **Sincronização Bidirecional (Pull)**: Dados baixados da nuvem automaticamente no login/startup.
- [x] **Configuração de Metas**: Meta semanal customizável e persistente.
- [x] **Indicador de Status de Sync**: Ícone de nuvem no Header mostrando status de conexão/sync.
- [x] **Sincronização Real-time**: Séries são salvas na nuvem assim que marcadas.
- [x] **Auditoria de RLS (Supabase)**: Implementada lógica de mapeamento snake_case e isolamento por usuário.
- [x] **Otimização de Banco**: Índices compostos para consultas rápidas de histórico e sets.

### Phase 8 – Perfect Synchronization & Maintenance [ACTIVE]
- [ ] **Remove Local Reset**: Remove the "Resetar Dados" button as synchronization should be the single truth.
- [ ] **Mirroring Pull**: Update `pullData` to clear local data for the user before applying server data (Symmetry Sync).
- [ ] **Conflict Resolution**: Ensure local changes are pushed before pulling to avoid data loss.
- [ ] **Exportation JSON**: Finalize the data sovereignty tool.

---

## 3. Estrutura do Sistema
- **Home**: Status atual, meta de consistência e resumo semanal.
- **Treinos**: Gestão de protocolos e montador de sessões.
- **Histórico**: Linha do tempo detalhada de atividades passadas.
- **Análise**: Gráficos de performance, carga progressiva e métricas.
- **Configuração**: Preferências de interface, metas e gestão de dados.

---

## 4. Tecnologias
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Componentes**: Radix UI / Shadcn / Base UI
- **Backend & Sync**: Supabase (Auth + Postgres)
- **Banco Local**: IndexedDB (Dexie.js) - 100% Offline first
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin
- **Analytics**: Recharts & Chart.js

---

## 5. Próximos Passos Imediatos
1. **EXPORTAÇÃO JSON**: Finalizar a ferramenta de soberania de dados para backup local.
2. **PWA NOTIFICATIONS**: Implementar notificações básicas para consistência.
3. **WIDGETS**: Atalhos na home para acesso rápido ao treino do dia.

---

## 8. Status Atual
- **Versão**: 1.6.0-ULTIMATE
- **Estado**: Funcional com sincronização cloud robusta e métricas avançadas.
- **Foco**: Soberania de dados e Notificações.

---

Este roadmap reflete a transição de um MVP local para um ecossistema sincronizado e robusto de treinamento.