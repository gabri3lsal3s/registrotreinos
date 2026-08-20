# Diretrizes e Arquitetura PWA (Progressive Web App)

## 1. Visão Geral do PWA

O **Registro de Treinos** é projetado como uma **PWA Standalone de Alta Disponibilidade**, permitindo que praticantes de musculação utilizem o aplicativo em academias sem conexão à internet (subsolos ou áreas com sinal fraco) com funcionamento idêntico ao modo online.

---

## 2. Ecossistema de Assets e Ícones PWA

A identidade visual adota a paleta **Zinc & Emerald**, com design minimalista e focado nos halteres de musculação:

### 2.1. Arquivos Fontes (SVG Master)
- **`public/icon.svg`**: Ícone master (512x512) com haltere estilizado em destaque, anilhas em gradiente esmeralda (`#6ee7b7` ➔ `#34d399` ➔ `#10b981` ➔ `#047857`), barra metálica com textura de pegada (knurling) e travas em squircle Dark Zinc 950 (`#09090b`). Utilizado para ícones `purpose: any`.
- **`public/maskable-icon.svg`**: Ícone maskable (512x512) com safe-zone de 80% (área interna de 410x410 centralizada) e fundo sólido Zinc 950 (`#09090b`), garantindo compatibilidade com qualquer formato de launcher Android (círculo, squircle, lágrima).
- **`public/favicon.svg`**: Favicon vetorial minimalista de alto contraste para abas de navegadores.

### 2.2. Estrutura de Diretórios de Assets Gerados
```
public/
├── favicon.svg                          # Favicon vetorial do browser
├── icon.svg                             # Ícone SVG master (512x512)
├── maskable-icon.svg                    # Ícone SVG maskable com 80% safe zone
├── manifest.json                        # Manifesto PWA completo com shortcuts
├── icon-192.png / icon-512.png / logo.png # Fallbacks legados na raiz
├── icons/
│   ├── pwa-192x192.png                  # Ícone PWA Any (192px)
│   ├── pwa-512x512.png                  # Ícone PWA Any (512px)
│   ├── pwa-192x192-maskable.png         # Ícone PWA Maskable (192px)
│   ├── pwa-512x512-maskable.png         # Ícone PWA Maskable (512px)
│   ├── apple-touch-icon-180x180.png     # Apple Touch Icon (180px)
│   ├── apple-touch-icon.png             # Apple Touch Icon padrão
│   ├── apple-touch-icon-167x167.png     # iPad Pro (167px)
│   ├── apple-touch-icon-152x152.png     # iPad Retina (152px)
│   ├── apple-touch-icon-120x120.png     # iPhone Retina (120px)
│   └── apple-touch-icon-76x76.png       # iPad Standard (76px)
└── splash/
    ├── iphone_430x932@3x.png            # iPhone 14/15/16 Pro Max (1290x2796)
    ├── iphone_390x844@3x.png            # iPhone 12/13/14 Pro (1170x2532)
    ├── iphone_375x667@2x.png            # iPhone SE / 8 (750x1334)
    ├── ipad_1024x1366@2x.png            # iPad Pro 12.9" (2048x2732)
    └── ipad_834x1194@2x.png             # iPad Pro 11" (1668x2388)
```

### 2.3. Script de Geração Automatizada (`scripts/generate-assets.sh`)
Para regenerar todos os assets PNG a partir dos SVGs:
```bash
bash scripts/generate-assets.sh
```

---

## 3. Configuração do Manifesto (`public/manifest.json`)

O arquivo de manifesto define o comportamento de instalação no sistema operacional:
```json
{
  "short_name": "Treinos",
  "name": "Registro de Treinos — Performance Control",
  "description": "PWA offline-first para rastreamento de hipertrofia, análise de volume, sobrecarga progressiva, 1RM e biofeedback.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui", "window-controls-overlay"],
  "orientation": "portrait",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "categories": ["fitness", "health", "sports", "productivity"],
  "shortcuts": [
    { "name": "Iniciar Treino", "short_name": "Treinar", "url": "/protocols" },
    { "name": "Histórico de Treinos", "short_name": "Histórico", "url": "/history" },
    { "name": "Análises e Métricas", "short_name": "Métricas", "url": "/analysis" }
  ]
}
```

---

## 4. Service Worker e Estratégia de Cache

### 4.1. Estratégia de Cache para Assets Estáticos (Cache-First / Stale-While-Revalidate)
1. **Assets Estáticos**: O bundle de produção (JS, CSS, fontes e ícones) é armazenado em cache para inicialização instantânea.
2. **Requisições de API (Supabase)**: Utilizam a estratégia **Network-First** com fallback inteligente para a base IndexedDB local.

---

## 5. Guia de Instalação e Testes

### 5.1. Instalação no iOS (Safari)
1. Abra o aplicativo no navegador Safari.
2. Toque no botão **Compartilhar** (ícone do quadrado com a seta para cima).
3. Role para baixo e selecione **Adicionar à Tela de Início**.
4. Confirme o nome e toque em **Adicionar**.

### 5.2. Instalação no Android (Chrome)
1. Abra o app no Google Chrome.
2. Toque no banner automático "Instalar aplicativo" ou no menu de três pontos.
3. Selecione **Instalar Aplicativo** ou **Adicionar à tela inicial**.
