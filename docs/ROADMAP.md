# 🗺️ Roadmap de Desenvolvimento e Entregas (v1.9.0-CONSOLIDATED)

Este documento registra a evolução do **Registro de Treinos**, cobrindo todas as fases concluídas e marcos arquiteturais.

---

## 📊 Status Consolidado dos 5 Níveis

| Nível | Foco / Módulo | Principais Entregas | Status |
| :--- | :--- | :--- | :---: |
| **Nível 1** | 🔴 Integridade de Dados & Saneamento | Service Worker PWA (`public/sw.js`), isolamento multi-usuário estrito no `syncService.ts`, cálculo universal PT-BR (`parseLocaleNumber`), tipos de séries (`normal`, `warmup`, `feeder`, `top`, `drop`). | **CONCLUÍDO** ✅ |
| **Nível 2** | 🟡 Tipografia & Gym UX | Screen Wake Lock API (`useWakeLock.ts`), Rest Timer flutuante com Web Audio API e vibração háptica, botões de micro-incrementos (-1kg/+1kg/+2kg), `ConfirmDialog` do Radix UI substituindo `window.confirm`. | **CONCLUÍDO** ✅ |
| **Nível 3** | 🟢 Modularização do Montador | Clonagem rápida de protocolos (`duplicateProtocol`), desacoplamento modular de `src/components/protocols/` (`ProtocolCard`, `DraggableExerciseCard`, `ExercisePickerModal`, `ProtocolBuilder`). | **CONCLUÍDO** ✅ |
| **Nível 4** | 🔵 Histórico, Dashboard & Performance | Code-splitting e manual chunks (`vendor-charts`, `vendor-db`, `vendor-dnd`, `vendor-icons`), sincronização reativa ao retornar online, filtros rápidos no histórico, modais de edição, Dashboard com botão 1-toque e banner ativo. | **CONCLUÍDO** ✅ |
| **Nível 5** | ⚪ Soberania de Dados & Backups | Backup estruturado JSON (`exportBackupJSON`), exportação de histórico em CSV compatível com Excel/Sheets (UTF-8 BOM), restauração Mesclar/Substituir, painel de contadores granulares de sincronização. | **CONCLUÍDO** ✅ |
| **Nível 6** | 🟣 Refinamento Desktop & Responsividade | **Sidebar Desktop lateral dedicada** (`w-64 fixed`), **Bottom Navigation fluida**, padronização de larguras (`max-w-4xl`), componente modular [`WorkoutSetRow.tsx`](file:///home/gabrielsales/meus_apps/registrotreinos/src/components/workout/WorkoutSetRow.tsx) DRY e eliminação total de quebras de layout mobile. | **CONCLUÍDO** ✅ |

---

## 🔮 Marcos Futuros (Planejados)
1. **Compartilhamento de Protocolos via Link/QR Code**: Permitir que treinadores compartilhem planilhas diretamente por URL criptografada.
2. **Integração com Wearables (Smartwatches)**: Registro rápido de séries via Web Bluetooth / APIs vestíveis.
