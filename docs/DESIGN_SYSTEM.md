# 🎨 Design System: Zinc & Emerald

O design system do **Registro de Treinos** é fundamentado na paleta semântica **Zinc & Emerald**, priorizando legibilidade sob luz solar de academia, ergonomia touch-first e responsividade impecável entre mobile e desktop.

---

## 1. Tokens de Cores Semânticas

| Token | Modo Claro (Light) | Modo Escuro OLED (Dark) | Aplicação |
| :--- | :--- | :--- | :--- |
| **`--background`** | `#f9fafb` (Zinc 50) | `#000000` (Pure Pitch Black) | Fundo principal da aplicação e telas OLED |
| **`--card`** | `#ffffff` (Pure White) | `#09090b` (Deep Charcoal Card) | Cards de exercícios, dashboards e modais |
| **`--foreground`** | `#09090b` (Zinc 950) | `#ffffff` (Pure White High Contrast) | Títulos e textos de alto contraste |
| **`--muted-foreground`**| `#3f3f46` (Zinc 700) | `#a1a1aa` (Zinc 400) | Legendas, metadados e notas secundárias (WCAG AAA) |
| **`--primary`** | `#10b981` (Emerald 500) | `#10b981` (Emerald 500) | Destaque ativo, botões primários e PRs |
| **`--primary-foreground`**| `#ffffff` | `#000000` (Pure Black on Emerald) | Texto de alto contraste sobre botões primários |
| **`--border`** | `#d1d5db` (Zinc 300) | `#1e1e24` (Crisp Dark Border) | Bordas e divisórias estruturais finas e nítidas |
| **`--input`** | `#f3f4f6` (Zinc 100) | `#000000` (Pure Black Input) | Campos de digitação de carga e repetições |
| **`--destructive`** | `#ef4444` (Red 500) | `#ef4444` (Red 500) | Ações destrutivas e cancelamento |

---

## 2. Escala Tipográfica Oficial Responsiva

| Nível Visual | Classes Tailwind | Uso / Contexto |
| :--- | :--- | :--- |
| **Título Principal (`h1`)** | `text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight` | Cabeçalhos de Página (`PageHeader`) e Logo da Sidebar |
| **Título de Seção / Hero (`h2`/`h3`)** | `text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight` | Títulos de Seção, Hero Cards e Modais |
| **Nome de Exercício / Item (`h4`/`h5`)** | `text-sm sm:text-base font-bold text-foreground` | Nomes de Exercícios, Protocolos e Listas |
| **Inputs e Valores** | `text-sm sm:text-base font-bold` | Campos de Carga, Repetições, E-mail e Senha |
| **Legendas / Metadados** | `text-xs sm:text-sm text-muted-foreground font-medium` | Subtítulos, notas de treino e timestamps |
| **Badges / Tags / Micro-Labels** | `text-xs font-bold uppercase tracking-wider` | Tags de Série (**N**, **W**, **F**, **T**, **D**), Dias e Status |
| **Destaques Numéricos** | `text-2xl sm:text-3xl font-black font-mono tracking-tight` | Métricas de Volume, 1RM, Cargas e PRs |

---

## 3. Identidade de Marca e Iconografia Oficial (Logo PWA)

1. **Símbolo Oficial**: Squircle sólido em tom unificado **Emerald 500 (`#10b981`)** contendo o haltere diagonal em branco puro (`#ffffff`), reproduzindo perfeitamente o componente visual (`bg-primary text-primary-foreground rounded-2xl`) do topo da barra lateral e cabeçalho de login.
2. **Formatos Oficiais**:
   - `public/icon.svg` (Vetor Master com fundo sólido Emerald 500 e haltere branco)
   - `public/maskable-icon.svg` (Vetor com safe zone de 80% e fundo sólido esmeralda contínuo)
   - `public/favicon.svg` (Favicon vetorial sólido para abas)
   - `public/icons/` e `public/splash/` (Assets PNG gerados para todas as resoluções Android e iOS)

---

## 4. Iconografia Semântica por Grupo Muscular (Lucide Icons)

Para escaneabilidade visual imediata no salão de treino sem emojis, o app utiliza um mapeamento de ícones e cores com alto contraste:

| Grupo Muscular | Ícone Lucide | Significado Visual | Token Tailwind |
| :--- | :--- | :--- | :--- |
| **Peito** | `Shield` | Estrutura frontal e peitoral | `text-sky-400 bg-sky-500/10 border-sky-500/20` |
| **Costas** | `Layers` | Densidade e feixes dorsais | `text-amber-400 bg-amber-500/10 border-amber-500/20` |
| **Quadríceps / Pernas** | `Zap` | Potência e tração dos membros inferiores | `text-emerald-400 bg-emerald-500/10 border-emerald-500/20` |
| **Isquiotibiais** | `Footprints` | Cadeia posterior e passada | `text-teal-400 bg-teal-500/10 border-teal-500/20` |
| **Glúteos** | `CircleDot` | Ponto focal e ativação pélvica | `text-rose-400 bg-rose-500/10 border-rose-500/20` |
| **Panturrilhas** | `TrendingUp` | Elevação e impulso plantar | `text-lime-400 bg-lime-500/10 border-lime-500/20` |
| **Ombros** | `Triangle` | Deltoides e silhueta em V | `text-purple-400 bg-purple-500/10 border-purple-500/20` |
| **Bíceps** | `Flame` | Flexão e pico de contração dos braços | `text-red-400 bg-red-500/10 border-red-500/20` |
| **Tríceps** | `ArrowDown` | Extensão e empurrada posterior do braço | `text-orange-400 bg-orange-500/10 border-orange-500/20` |
| **Core** | `Crosshair` | Estabilidade central e centro de massa | `text-indigo-400 bg-indigo-500/10 border-indigo-500/20` |
| **Outros** | `Dumbbell` | Padrão geral de treino com pesos | `text-zinc-400 bg-zinc-500/10 border-zinc-500/20` |

---

## 5. Ergonomia Mobile & Gym UX

1. **Alvos de Toque Mínimos**: Todos os botões interativos possuem no mínimo **44px** (`h-11` ou `h-11 w-11`).
2. **Auto-seleção ao Focar**: Campos numéricos executam `onFocus={(e) => e.target.select()}` para substituição instantânea de carga e reps com luvas de treino.
3. **Screen Wake Lock**: Mantém a tela ligada durante a sessão ativa via `useWakeLock.ts`.
4. **Rest Timer com Web Audio e Vibração**: Feedback acústico gerado via Web Audio API e vibração háptica de 40ms/200ms.
