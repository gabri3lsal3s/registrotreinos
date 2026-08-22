# Especificação Funcional e Regras de Negócio

## 1. Visão Geral do Produto
O **Registro de Treinos** é uma Progressive Web App (PWA) de alto desempenho focada no público praticante de musculação, calistenia e treinamento de força. O sistema prioriza velocidade extrema de registro durante a sessão, visual minimalista de alto contraste (Zinc & Emerald) e operação **100% Offline-First** com sincronização bidirecional na nuvem (Supabase).

---

## 2. Regras de Negócio Essenciais

### 2.1. Arquitetura Offline-First & Soberania de Dados
1. **Prioridade do Banco Local**: Toda operação de leitura e gravação ocorre prioritariamente no banco local **IndexedDB** gerenciado via **Dexie.js**.
2. **Flag de Sincronismo (`isSynced`)**:
   - Todo registro criado ou editado localmente recebe `isSynced = false`.
   - Ao concluir um push bem-sucedido para o Supabase, a flag é alterada para `isSynced = true`.
3. **Isolamento por Usuário**: Todos os dados no IndexedDB e no Supabase são associados a um `userId` único (UUID), garantindo isolamento total em dispositivos compartilhados.

### 2.2. Gestão de Protocolos e Exercícios
1. **Protocolos de Treino**:
   - Um protocolo representa uma divisão de treino (ex: "Treino A - Peito e Tríceps", "Push Day").
   - Contém nome, descrição opcional, status de ativação (`isEnabled`) e dias da semana atribuídos (`daysOfWeek`).
2. **Exercícios e Categorização**:
   - Cada exercício pertence a um protocolo ou sessão e possui:
     - `name`: Nome do exercício.
     - `muscleGroup`: Agrupamento muscular (Peito, Costas, Quadríceps, Isquiotibiais, Glúteos, Panturrilhas, Ombros, Bíceps, Tríceps, Core, Outros).
     - `category`: Categoria de medição:
       - `weight`: Carga externa em kg + repetições.
       - `bodyweight`: Peso corporal com fator de alavancagem ($K$) + peso adicional + repetições.
       - `time`: Exercícios isométricos ou por tempo (tempo em segundos + peso adicional).
     - `multiplier` ($K$): Proporção do peso corporal utilizada no exercício (ex: Barra Fixa = 1.0, Flexão = 0.65, Paralelas = 1.0, Prancha = 0.5).
3. **Dicionário Canônico e Normalização**:
   - O sistema conta com um dicionário inteligente (`exerciseDictionary.ts`) que normaliza variações ortográficas, remove acentos/parênteses e categoriza automaticamente o grupamento muscular e parâmetros $K$.
4. **Exportação e Importação Universal de Protocolos**:
   - **Exportação JSON**: Gera arquivo padronizado (`registrotreinos-protocol` v1) contendo a divisão de dias e lista de exercícios para backup individual ou compartilhamento com outros usuários.
   - **Importação Universal**: O assistente (`universalProtocolParser.ts` e `ImportProtocolModal.tsx`) aceita arquivos (`.json`, `.csv`, `.tsv`, `.txt`) e texto colado de tabelas (Markdown, CSV ou texto livre de IAs como ChatGPT/Gemini), convertendo automaticamente séries, repetições, dias da semana e grupos musculares antes de salvar de forma atômica no IndexedDB.
5. **Tombstones & Soft-Deletes Nativos**:
   - Toda exclusão de treinos, séries, protocolos, exercícios e registros de peso corporal aplica **Soft-Delete** (`isDeleted: true`, `deletedAt: Date.now()`, `updatedAt: Date.now()`, `isSynced: false`).
   - Isso garante propagação atômica e idempotente entre múltiplos dispositivos e clientes offline, eliminando qualquer risco de ressurreição de dados no PULL.
   - Consultas regulares no app filtram automaticamente registros marcados com `isDeleted === true`.

### 2.3. Execução de Treinos e Registro de Séries
1. **Sessão Ativa (`status: 'active'`) & Idempotência Garantida**:
   - O usuário possui uma única sessão de treino ativa por protocolo.
   - `startWorkout` opera de forma **estritamente idempotente**: antes de instanciar um novo UUID, verifica e retorna qualquer sessão ativa existente para o par `(userId, protocolId)`. Isso elimina o risco de treinos duplicados em caso de cliques rápidos ou conexões concorrentes.
   - Séries (`WorkoutSet`) são persistidas e atualizadas imediatamente a cada preenchimento/toggle de conclusão.
2. **Persistência de Foco e Resiliência Mobile (`Smart Focus` & In-Memory Preserving)**:
   - **Preservação de Estado e Imunidade ao Background**: Ao apagar a tela do celular, alternar de aplicativo ou passar por revalidação de tokens no Supabase, o app preserva intactas todas as séries concluídas e os valores de carga/repetições digitados pelo usuário na memória volátil, evitando que re-renderizações destrutivas zerem a tela.
   - **Auto-Foco Inteligente**: Ao abrir ou restaurar um treino em andamento, o app foca automaticamente no primeiro exercício com séries pendentes.
   - **Auto-Avanço Suave**: Ao concluir todas as séries do exercício atual, o card seguinte com séries pendentes é expandido automaticamente.
   - **Limpeza Automática**: O estado do exercício ativo no `localStorage` é liberado ao finalizar ou cancelar o treino.
3. **Histórico do Último Treino ("Ant: XXkg x YY")**:
   - A interface exibe a carga e repetições da última execução completada para guiar a progressão de sobrecarga.
4. **Exercícios de Sessão (`isSessionOnly`)**:
   - Permite adicionar exercícios avulsos apenas na sessão atual sem alterar a estrutura fixa do protocolo salvo.
5. **Finalização de Treino**:
   - Ao concluir, o status passa para `'completed'`, o timestamp `finishedAt` é registrado e o estado de prontidão/biofeedback (sono, estresse, humor) é anexado.

### 2.4. Cálculos de Performance e Métricas de Análise
1. **Volume de Carga por Série**:
   - **Peso Convencional (`weight`)**: $\text{Volume} = \text{Carga} \times \text{Reps}$
   - **Calistenia (`bodyweight`)**: $\text{Volume} = ((\text{Peso Corporal} \times K) + \text{Carga Adicional}) \times \text{Reps}$
   - **Isometria / Tempo (`time`)**: $\text{Volume} = ((\text{Peso Corporal} \times K) + \text{Carga Adicional}) \times \left(\frac{\text{Tempo (s)}}{10}\right)$
2. **1RM Estimado (Fórmula de Epley)**:
   - Para exercícios de repetição:
     $$\text{e1RM} = \text{Carga Equivalente} \times \left(1 + \frac{\text{Reps}}{30}\right)$$
3. **Força Relativa**:
   $$\text{Força Relativa} = \frac{\text{e1RM}}{\text{Peso Corporal}}$$
4. **Consistência Semanal Corrente**:
   - Cálculo baseado nos treinos concluídos no intervalo da semana ativa (de Domingo 00:00:00 a Sábado 23:59:59).
   - Marcação diária individual mapeada por chave canônica de dia (`sun`, `mon`, `tue`, `wed`, `thu`, `fri`, `sat`) com meta configurável derivada dos protocolos ativos.
5. **Resiliência e Normalização Temporal**:
   - Todas as datas e timestamps de treinos, séries e pesagens são normalizados para timestamps inteiros UTC, prevenindo incoerências entre formatos de data de diferentes provedores.

---

## 3. Mapeamento de Telas e Fluxos

| Tela | Rota | Responsabilidade Principal |
| :--- | :--- | :--- |
| **Autenticação** | `/auth` | Login, cadastro e autenticação segura com Supabase Auth. |
| **Dashboard (Home)** | `/` | Treino sugerido do dia, status de consistência semanal, registro rápido de peso corporal e atalhos. |
| **Treinos / Protocolos** | `/protocols` | CRUD de divisões de treino, ordenação drag-and-drop de exercícios e montador de treinos. |
| **Execução de Treino** | `/workout/:protocolId` | Interface de execução ativa com inputs rápidos, histórico de carga anterior, cronômetro e biofeedback. |
| **Histórico** | `/history` | Linha do tempo de treinos concluídos, detalhamento de séries por exercício e exclusão segura. |
| **Análise de Performance** | `/analysis` | Gráficos de volume diário, evolução de 1RM por exercício, radar muscular e balanço por grupamento. |
| **Configurações** | `/settings` | Preferências de interface e feedback sonoro, monitoramento de integridade de sincronização, exportação/importação de backups e utilitários de cache PWA. |
