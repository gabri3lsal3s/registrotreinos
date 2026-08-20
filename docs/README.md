# 📚 Documentação Oficial - Registro de Treinos PWA (v2.0.0-EVOLUTION)

Bem-vindo à base de conhecimento e documentação arquitetural do aplicativo **Registro de Treinos**, uma aplicação web progressiva (**PWA Offline-First**) com foco em alta performance, usabilidade ergonômica em treinos e soberania de dados.

---

## 🗺️ Mapa da Documentação

| Documento | Descrição |
| :--- | :--- |
| **[SPECIFICATION.md](./SPECIFICATION.md)** | Regras de negócio, fórmulas matemáticas (Volume, 1RM, consistência), ciclo de vida do treino e tipos de séries. |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Arquitetura técnica, esquema Dexie.js (IndexedDB), sincronização com Supabase, isolamento multi-usuário e code-splitting. |
| **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** | Tokens visuais da paleta Zinc & Emerald, escala tipográfica responsiva oficial, regras de contraste e microinterações. |
| **[COMPONENTS.md](./COMPONENTS.md)** | Catálogo DRY de componentes (`common/`, `dashboard/`, `protocols/`, `workout/`, `history/`, `analysis/`, `ui/`). |
| **[PWA_GUIDELINES.md](./PWA_GUIDELINES.md)** | Configurações de Service Worker, cache offline, instalação em dispositivo móvel e Web APIs (Wake Lock, Web Audio, Haptics). |
| **[ROADMAP.md](./ROADMAP.md)** | Histórico evolutivo completo de todos os 13 níveis e marcos consolidados. |
| **[GOVERNANCE.md](./GOVERNANCE.md)** | Regras de governança de código, TypeScript estrito, política de zero lixo e protocolo de build. |

---

## 🚀 Tecnologias Centrais

- **Frontend**: React 19, TypeScript (Strict Mode), Vite 7, Tailwind CSS.
- **Armazenamento & Offline**: Dexie.js (IndexedDB local como fonte da verdade).
- **Sincronização & Backend**: Supabase (PostgreSQL, Row Level Security, Auth).
- **Gráficos & Análise**: Recharts com otimização em manual chunk separado (`vendor-charts`).
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`.
- **Áudio & Feedback**: Web Audio API sintetizada offline e Navigator Vibration API.
- **PWA & Telas**: Service Worker Cache-First com fallback de rede e Screen Wake Lock API.
