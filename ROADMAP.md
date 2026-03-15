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

### Fase 4 – Histórico e Análise [EM REFINAMENTO]
- [x] **Histórico**: Visualização detalhada de sessões e exercícios passados
- [x] **Análise**: Gráficos de carga progressiva e métricas básicas
- [x] Simplificação: Remoção de Insights por IA para manter foco em dados reais
- [ ] Refinamento de métricas automáticas (Volume total real por músculo)

### Fase 5 – UI/UX Premium e Refinamento [ATUAL]
- [x] Tema White de alto contraste
- [x] Sincronização de headers e navegação (Home, Treinos, Histórico, Análise, Configuração)
- [x] Microinterações e animações de feedback
- [ ] Testes de responsividade profunda (diferentes tamanhos de mobile)
- [ ] Refinamento de acessibilidade global

---

## 3. Estrutura do Sistema
- **Home**: Status atual e meta de consistência semanal.
- **Treinos**: Gestão de protocolos e planilhas de treinamento.
- **Histórico**: Linha do tempo completa e detalhada de treinos realizados.
- **Análise**: Evolução de performance e métricas de carga.
- **Configuração**: Preferências de interface e gestão de dados.

---

## 4. Tecnologias
- **Frontend**: React, TypeScript, Tailwind CSS
- **Componentes**: Radix UI / Shadcn based components
- **Banco**: IndexedDB (Dexie.js) - 100% Offline first
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin

---

## 5. Pendências e Próximos Passos
- [ ] Implementar visualização de progressão por exercício individual (drill-down)
- [ ] Refinar lógica de "Meta Semanal" para ser customizável na Configuração
- [ ] Exportação/Backup de dados JSON

---

## 8. Status Atual
- **Versão**: 1.2.0-PRO
- **Estado**: Estável em ambiente de dev
- **Foco**: Polimento final de UX e Dashboard expandido.

---

Este roadmap reflete a transição para um design mais limpo e a remoção de dependências de IA externas em prol de um sistema mais ágil e focado no usuário regular de academia.