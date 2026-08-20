# 🗺️ Roadmap de Desenvolvimento e Entregas (v2.0.0-EVOLUTION)

Este documento registra a evolução do **Registro de Treinos**, cobrindo todas as fases concluídas, níveis em desenvolvimento ativo e marcos futuros arquiteturais.

---

## 📊 Status Consolidado dos Níveis

| Nível | Foco / Módulo | Principais Entregas | Status |
| :--- | :--- | :--- | :---: |
| **Nível 1** | 🔴 Integridade de Dados & Saneamento | Service Worker PWA (`public/sw.js`), isolamento multi-usuário estrito no `syncService.ts`, cálculo universal PT-BR (`parseLocaleNumber`), tipos de séries (`normal`, `warmup`, `feeder`, `top`, `drop`). | **CONCLUÍDO** ✅ |
| **Nível 2** | 🟡 Tipografia & Gym UX | Screen Wake Lock API (`useWakeLock.ts`), Rest Timer flutuante com Web Audio API e vibração háptica, botões de micro-incrementos (-1kg/+1kg/+2kg), `ConfirmDialog` do Radix UI substituindo `window.confirm`. | **CONCLUÍDO** ✅ |
| **Nível 3** | 🟢 Modularização do Montador | Clonagem rápida de protocolos (`duplicateProtocol`), desacoplamento modular de `src/components/protocols/` (`ProtocolCard`, `DraggableExerciseCard`, `ExercisePickerModal`, `ProtocolBuilder`). | **CONCLUÍDO** ✅ |
| **Nível 4** | 🔵 Histórico, Dashboard & Performance | Code-splitting e manual chunks (`vendor-charts`, `vendor-db`, `vendor-dnd`, `vendor-icons`), sincronização reativa ao retornar online, filtros rápidos no histórico, modais de edição, Dashboard com botão 1-toque e banner ativo. | **CONCLUÍDO** ✅ |
| **Nível 5** | ⚪ Soberania de Dados & Backups | Backup estruturado JSON (`exportBackupJSON`), exportação de histórico em CSV compatível com Excel/Sheets (UTF-8 BOM), restauração Mesclar/Substituir, painel de contadores granulares de sincronização. | **CONCLUÍDO** ✅ |
| **Nível 6** | 🟣 Refinamento Desktop & Responsividade | **Sidebar Desktop lateral dedicada** (`w-64 fixed`), **Bottom Navigation fluida**, padronização de larguras (`max-w-4xl`), componente modular `WorkoutSetRow.tsx` DRY e eliminação total de quebras de layout mobile. | **CONCLUÍDO** ✅ |
| **Nível 7** | 🎨 Microinterações, Háptica, Áudio & Motion Polish | Feedback tátil customizado (Vibration API), sintetizador Web Audio para micro-ações (bips suaves, conclusão de série, PR), pill deslizante de abas com Framer Motion e transições fluidas de páginas. | **CONCLUÍDO** ✅ |
| **Nível 8** | ⚡ Gym Floor UX & Agilidade em Sessão | Calculadora de anilhas (*Plate Calculator*), mini-histórico inline nos exercícios, notas fixas (*Pin Notes*), presets de descanso no dock e Web Notifications de timer em background. | **PLANEJADO** 📋 |
| **Nível 9** | 📈 Inteligência, Gamificação Sutil & Analytics | Detecção instantânea e celebração de PRs (*Personal Records*), mapa de calor anual de frequência (*Consistency Heatmap*), balanço agonista/antagonista e card de conclusão compartilhável. | **PLANEJADO** 📋 |
| **Nível 10** | 🔄 Gestão Ágil de Rotinas & Intercâmbio | Substituição inteligente de exercícios ocupados, compartilhamento de protocolos via Link/QR Code descentralizado, templates consagrados (*Starter Packs*) e suporte a Supersets/Bi-sets. | **PLANEJADO** 📋 |

---

## 🎯 Detalhamento dos Níveis de Evolução

### 🎨 Nível 7: Microinterações, Háptica, Áudio & Motion Polish
*Objetivo: Elevar a experiência sensorial do aplicativo, tornando as interações táteis, ágeis e prazerosas dentro da rotina pesada de treino.*

1. **Controlador Sensorial Centralizado (`sensoryFeedback.ts`)**:
   - Presets hápticos otimizados (`light` para toques e ajustes, `medium` para abas, `success` para séries e `celebration` para PRs).
   - Sintetizador Web Audio com envelope ADSR suave para sons de feedback (sem dependência de arquivos externos de áudio).
   - Controles independentes nas Configurações para ligar/desligar sons e vibrações.
2. **Navegação Fluida & Indicador Deslizante (Framer Motion)**:
   - Indicador visual em pílula (*pill indicator*) com física de mola compartilhada (`layoutId`) na Bottom Navigation e na Sidebar Desktop.
   - Transição suave entre páginas com fade e leve deslocamento vertical (*subtle slide*).
3. **Micro-interações de Treino**:
   - Efeito elástico (*spring bounce*) e pulso esmeralda ao marcar séries como concluídas em `WorkoutSetRow`.
   - Feedback de *number pop* e vibração leve nos botões de micro-incrementos (-1kg, +1kg, +2kg).
   - Accordions de exercícios com abertura e fechamento suaves com animação de layout.

---

### ⚡ Nível 8: Gym Floor UX & Agilidade em Sessão
*Objetivo: Maximizar a fluidez e velocidade de registro durante o treino dentro da academia, reduzindo atritos mecânicos e cognitivos.*

1. **Calculadora de Anilhas (*Plate Calculator*)**:
   - Modal/Gaveta acessível diretamente ao tocar na carga da série ou em ícone de anilha.
   - Cálculo automático da distribuição de anilhas para barras (padrão 20kg/15kg/10kg) utilizando conjunto de anilhas configuráveis (20, 15, 10, 5, 2.5, 1.25kg).
   - Representação visual esquemática da barra montada de cada lado.
2. **Mini-Histórico Inline de Exercício (*In-Workout Exercise History*)**:
   - Bottom sheet rápida ao tocar no nome do exercício na tela de treino.
   - Exibição das últimas 5 sessões daquele exercício específico com data, volume total, 1RM atingido e cargas de cada série.
3. **Notas Fixas e Regulagens por Exercício (*Pinned Notes*)**:
   - Campo de notas persistentes no exercício (ex: *"Banco no furo 4"*, *"Pegada neutra aberta"*, *"Polia altura 8"*).
   - Armazenado no protocolo e exibido como dica sutil durante o treino ativo.
4. **Dock de Descanso Otimizado com Web Notifications**:
   - Presets de 1-toque (`45s`, `60s`, `90s`, `120s`, `180s`) diretamente na barra inferior de descanso.
   - Integração com a Notification API e Service Worker para avisar o término do descanso mesmo se o app estiver em segundo plano.

---

### 📈 Nível 9: Inteligência, Gamificação Sutil & Analytics Avançado
*Objetivo: Elevar a motivação do atleta e fornecer diagnósticos profundos de sobrecarga progressiva e equilíbrio biomecânico.*

1. **Detecção e Celebração Automática de Recordes (PRs)**:
   - Algoritmo em tempo real comparando a série atual com o histórico de carga absoluta e e1RM (Epley).
   - Badge visual animada (*Emerald PR*) ao marcar a série e lista destacada no modal de conclusão.
2. **Mapa de Calor Anual de Consistência (*Annual Heatmap*)**:
   - Grade anual de 52 semanas no Dashboard e Análise (estilo GitHub commits) colorida com tons de esmeralda conforme a densidade/volume do dia.
   - Contadores de sequência atual (*streak*) e maior sequência de semanas ativas.
3. **Balanço Agonista / Antagonista & Alertas Posturais**:
   - Gráfico de proporção de séries semanais entre padrões motores antagônicos (ex: Empurrar Horizontal vs Puxar Horizontal; Quadríceps vs Isquiotibiais).
   - Indicador visual de zonas musculares com volume abaixo ou acima da faixa ótima de hipertrofia (10 a 20 séries/semana).
4. **Card Visual de Conclusão Compartilhável (*Shareable Workout Summary*)**:
   - Gerador de card em alta resolução estilizado em Zinc/Emerald com resumo da sessão (Duração, Volume Total, PRs conquistados, grupos musculares).
   - Botão de 1-toque para copiar para a área de transferência ou compartilhar via Web Share API.

---

### 🔄 Nível 10: Gestão Ágil de Rotinas & Intercâmbio Descentralizado
*Objetivo: Proporcionar total flexibilidade na academia e facilitar o compartilhamento de fichas de treino entre amigos e treinadores.*

1. **Substituição Rápida de Exercícios Ocupados**:
   - Botão *"Substituir Aparelho"* sugerindo automaticamente variações do mesmo grupo muscular e categoria biomecânica (ex: *Supino Inclinado Halteres* $\rightarrow$ *Supino Inclinado Máquina* ou *Smith*).
   - Preservação do histórico comparativo de sobrecarga.
2. **Compartilhamento de Protocolos via Link / QR Code**:
   - Exportação e importação de rotinas completas via URL com payload criptografado/comprimido em base64 na hash da URL.
   - Permite que usuários importem treinos de instrutores ou colegas sem necessidade de banco de dados centralizado.
3. **Biblioteca de Templates Consagrados (*Starter Packs*)**:
   - Modelos prontos de divisões de treinamento populares (PPL 6x, Upper/Lower 4x, Fullbody 3x, ABC Clássico) importáveis com 1 clique.
4. **Séries Casadas (*Supersets / Bi-sets*)**:
   - Agrupamento visual de exercícios no montador e na tela de execução com cronômetro conjunto e transição imediata.
