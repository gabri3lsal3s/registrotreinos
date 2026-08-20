# 🎨 Design System: Zinc & Emerald

O design system do **Registro de Treinos** é fundamentado na paleta semântica **Zinc & Emerald**, priorizando legibilidade sob luz solar de academia, ergonomia touch-first e responsividade impecável entre mobile e desktop.

---

## 1. Tokens de Cores Semânticas

| Token | Modo Claro (Light) | Modo Escuro (Dark) | Aplicação |
| :--- | :--- | :--- | :--- |
| **`--background`** | `#f9fafb` (Zinc 50) | `#09090b` (Zinc 950) | Fundo principal da aplicação |
| **`--card`** | `#ffffff` (Pure White) | `#121214` (Elevated Card) | Cards de exercícios, dashboards e modais |
| **`--foreground`** | `#09090b` (Zinc 950) | `#fafafa` (Zinc 50) | Títulos e textos de alto contraste |
| **`--muted-foreground`**| `#3f3f46` (Zinc 700) | `#a1a1aa` (Zinc 400) | Legendas, metadados e notas secundárias |
| **`--primary`** | `#10b981` (Emerald 500) | `#34d399` (Emerald 400) | Destaque ativo, botões primários e PRs |
| **`--border`** | `#d1d5db` (Zinc 300) | `#27272a` (Zinc 800) | Bordas e divisórias estruturais |
| **`--destructive`** | `#ef4444` (Red 500) | `#f87171` (Red 400) | Ações destrutivas e cancelamento |

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

## 3. Ergonomia Mobile & Gym UX

1. **Alvos de Toque Mínimos**: Todos os botões interativos possuem no mínimo **44px** (`h-11` ou `h-11 w-11`).
2. **Auto-seleção ao Focar**: Campos numéricos executam `onFocus={(e) => e.target.select()}` para substituição instantânea de carga e reps com luvas de treino.
3. **Screen Wake Lock**: Mantém a tela ligada durante a sessão ativa via `useWakeLock.ts`.
4. **Rest Timer com Web Audio e Vibração**: Feedback acústico gerado via Web Audio API e vibração háptica de 40ms/200ms.
