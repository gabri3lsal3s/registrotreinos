# Registro de Treinos – PWA de Performance

Uma aplicação web progressiva (PWA) de alto desempenho focada no registro ágil de treinos de musculação, acompanhamento de carga progressiva e métricas de hipertrofia.

## 🚀 Principais Funcionalidades

- **Offline First**: Funcionamento 100% sem internet via Service Workers e IndexedDB (Dexie).
- **Mobile-First Design**: Interface minimalista premium otimizada para uso rápido durante o treino.
- **Progressão de Carga**: Gráficos automáticos de Volume Total e 1RM Estimado.
- **Temas**: Suporte completo a Modo Claro e Escuro com paleta Zinc & Emerald.
- **Gestão de Protocolos**: Monte seus planos de treinamento e acompanhe a consistência semanal.

## 🛠️ Tecnologias

- **Framework**: React 19 + Vite
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS 4
- **Banco de Dados**: Dexie.js (IndexedDB)
- **Nuvem/Sincronização**: Supabase (PostgreSQL & Auth)
- **Componentes**: Radix UI / Shadcn
- **Ícones**: Lucide React
- **Gráficos**: Recharts

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

## 📚 Documentação Técnica Completa

Toda a documentação técnica, decisões de engenharia, catálogo de componentes e guias de governança estão centralizados na pasta [`docs/`](file:///home/gabrielsales/meus_apps/registrotreinos/docs/README.md):

- 📖 **[Índice Geral de Documentação](file:///home/gabrielsales/meus_apps/registrotreinos/docs/README.md)**: Mapa completo e ordem de leitura.
- 📋 **[Especificações & Regras de Negócio](file:///home/gabrielsales/meus_apps/registrotreinos/docs/SPECIFICATION.md)**: Fórmulas de volume, 1RM, consistência e fluxo de treinos.
- 🏗️ **[Arquitetura do Sistema](file:///home/gabrielsales/meus_apps/registrotreinos/docs/ARCHITECTURE.md)**: Estrutura Local-First, IndexedDB v6 e Cloud Sync.
- 🎨 **[Design System](file:///home/gabrielsales/meus_apps/registrotreinos/docs/DESIGN_SYSTEM.md)**: Paleta Zinc & Emerald, tokens de tema e microinterações.
- 🧩 **[Catálogo de Componentes](file:///home/gabrielsales/meus_apps/registrotreinos/docs/COMPONENTS.md)**: Hierarquia DRY e contratos de props TypeScript.
- 📱 **[Diretrizes PWA](file:///home/gabrielsales/meus_apps/registrotreinos/docs/PWA_GUIDELINES.md)**: Configurações de Service Worker, cache offline e instalação.
- 🗺️ **[Roadmap de Desenvolvimento](file:///home/gabrielsales/meus_apps/registrotreinos/docs/ROADMAP.md)**: Fases do projeto e próximos marcos.
- ⚖️ **[Governança de Código](file:///home/gabrielsales/meus_apps/registrotreinos/docs/GOVERNANCE.md)**: Padrões de nomenclatura e regra da documentação viva.
- 🤖 **[Diretrizes para Agentes de IA](file:///home/gabrielsales/meus_apps/registrotreinos/AGENTS.md)**: Instruções para agentes autônomos.

---

Desenvolvido com foco em agilidade, precisão e soberania de dados para entusiastas da musculação.
