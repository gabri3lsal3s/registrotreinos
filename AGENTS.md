# Diretrizes para Agentes Autônomos de IA (AGENTS.md)

Este repositório adota padrões rígidos de arquitetura, organização de pastas e documentação viva. Todo agente de IA operando nesta base de código deve seguir estritamente as instruções deste guia.

---

## 1. Mapa de Contexto e Documentação

Antes de realizar modificações estruturais ou implementar novas funcionalidades, consulte a pasta `docs/`:

1. **[docs/README.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/README.md)**: Índice geral e mapa de dependências conceituais.
2. **[docs/SPECIFICATION.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/SPECIFICATION.md)**: Regras de negócio, fórmulas matemáticas (Volume, 1RM, consistência) e fluxos de dados.
3. **[docs/ARCHITECTURE.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/ARCHITECTURE.md)**: Decisões técnicas, esquema IndexedDB e padrão de sincronização com Supabase.
4. **[docs/DESIGN_SYSTEM.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/DESIGN_SYSTEM.md)**: Tokens visuais da paleta Zinc & Emerald e microinterações.
5. **[docs/COMPONENTS.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/COMPONENTS.md)**: Catálogo DRY de componentes, contratos de props e separação entre `common/` e `ui/`.
6. **[docs/PWA_GUIDELINES.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/PWA_GUIDELINES.md)**: Configurações de PWA, Service Worker e estratégias offline.
7. **[docs/ROADMAP.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/ROADMAP.md)**: Fases ativas e marcos futuros.
8. **[docs/GOVERNANCE.md](file:///home/gabrielsales/meus_apps/registrotreinos/docs/GOVERNANCE.md)**: Regras mandatórias de manutenção de código e arquivos.

---

## 2. Princípios Arquiteturais Invioláveis

1. **Offline-First Absoluto**: O aplicativo deve funcionar perfeitamente mesmo sem internet. Toda operação do usuário grava primeiro no Dexie.js (`WorkoutDB`) e marca o registro com `isSynced: false`.
2. **Sincronização em Background**: A sincronização remota com o Supabase é disparada de forma não bloqueante através de `syncService.ts`.
3. **Isolamento por Usuário**: Todas as entidades no IndexedDB e no Supabase são escopadas pelo `userId` do usuário autenticado.
4. **Respeito ao Design System**: Utilize exclusivamente a paleta semântica Zinc & Emerald com alto contraste e as utilidades de animação (`animate-in`, `fade-in`, `slide-in-from-bottom-*`).
5. **Zero Lixo na Raiz**: Nunca salve scripts de teste, arquivos `.txt` temporários ou anotações avulsas na raiz do projeto.

---

## 3. Protocolo de Conclusão de Tarefas

1. **Executar Build**: `npm run build` deve compilar com status `0` e sem erros de TypeScript.
2. **Atualizar Documentação**: Se a mudança afetou tipos, regras de negócio ou componentes, atualize o documento correspondente em `docs/`.
