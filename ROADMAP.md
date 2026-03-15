# Roadmap de Desenvolvimento – PWA Registro de Treinos (Hipertrofia & Biofeedback)

## 1. Visão Geral
Aplicação Web Progressiva (PWA) mobile-first, responsiva para desktop, com foco em rastreamento de hipertrofia, análise de progressão via IA, funcionamento 100% offline e autenticação (login, senha e biometria). Visual dark premium com acentos azul neon e verde limão, inspirado em dashboards de biofeedback.

---

## 2. Fases do Desenvolvimento

### Fase 1 – Setup Inicial
- Escolha do stack: React + Vite + TypeScript
- Configuração do Tailwind CSS (tema dark premium customizado)
- Setup do PWA (manifest, service worker, cache offline)
- Estruturação de pastas e organização do projeto

### Fase 2 – Autenticação e Usuários
- Tela de cadastro/login (email, senha)
- Integração com biometria (WebAuthn/Fingerprint/FaceID, fallback para senha)
- Armazenamento seguro local (IndexedDB/LocalStorage + criptografia)
- Lógica de múltiplos usuários no mesmo dispositivo

### Fase 3 – Gestão de Protocolos e Treinos
- CRUD de protocolos semanais (ABC, Upper/Lower, Push/Pull, etc.)
- Cadastro de exercícios: campos para carga (kg), repetições, séries, RPE
- Histórico rápido do último treino visível durante digitação
- Modo de execução: cronômetro entre séries, botão check rápido
- Registro pós-treino: sumário gerado por IA

### Fase 4 – Dashboard Biométrico & Mood Tracker
- Gráficos interativos (peso corporal, 1RM, volume total)
- Correlação entre humor, sono, estresse e performance
- Campo de humor do dia (escala 1-5)
- Diário de recuperação mental (notas sobre sono/estresse)

### Fase 5 – Notificações Inteligentes
- Lembretes de hidratação, alimentação e descanso (baseados no treino)
- Notificações push e locais (funcionando offline)

### Fase 6 – Motor de IA
- Análise da curva de volume total (séries × repetições × carga)
- Sugestão de incrementos baseados em evidências científicas
- Feedback pós-treino: manter, subir ou consolidar carga

### Fase 7 – UI/UX Premium
- Ícones de anatomia humana (SVG customizados)
- Tabelas compactas no mobile, expansíveis em desktop
- Animações e microinterações
- Testes de responsividade e acessibilidade
- Visual firstmobile baseado no shadcn

### Fase 8 – Testes e Refinamento
- Testes unitários e de integração
- Testes offline (simulação de perda de conexão)
- Testes de biometria e fallback
- Ajustes finais de performance e UX

---

## 3. Estrutura de Pastas Sugerida
- src/
  - components/
  - pages/
  - hooks/
  - services/
  - assets/
  - styles/
  - utils/
  - App.tsx, main.tsx

## 4. Tecnologias e Bibliotecas
- React, Vite, TypeScript
- Tailwind CSS
- Zustand ou Redux Toolkit
- IndexedDB (Dexie.js) para storage offline
- Chart.js ou Recharts
- WebAuthn API (biometria)
- Service Worker (PWA)
- dayjs (datas)

## 5. Considerações de Segurança
- Criptografia de dados sensíveis no storage local
- Hash de senha (bcryptjs)
- Autenticação biométrica via WebAuthn
- Fallback seguro para senha

## 6. Diferenciais para Psicologia/Performance
- Mood & Performance Tracker
- Diário de recuperação mental
- IA correlacionando humor, sono, estresse e performance física

## 7. Entregáveis de Cada Fase
- Fase 1: Projeto inicial rodando, tema dark premium, PWA básico
- Fase 2: Cadastro/login seguro, biometria funcional offline
- Fase 3: Gestão de treinos/protocolos, histórico e execução
- Fase 4: Dashboard biométrico e mood tracker
- Fase 5: Notificações inteligentes
- Fase 6: Motor de IA integrado
- Fase 7: UI/UX refinada, responsividade total
- Fase 8: Testes, ajustes finais e documentação

---

## 8. Próximos Passos
1. Aprovação do roadmap
2. Inicialização do projeto (Fase 1)
3. Implementação incremental conforme roadmap

---

Este roadmap pode ser ajustado conforme feedback e prioridades. Pronto para iniciar a Fase 2: Autenticação e Usuários.