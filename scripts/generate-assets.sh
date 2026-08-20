#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# generate-assets.sh — Gera todos os assets PNG do PWA (Zinc & Emerald)
# ═══════════════════════════════════════════════════════════════
#
# Uso: bash scripts/generate-assets.sh
#
# Requer: ImageMagick (convert / magick)
#
# Regenera os PNGs a partir dos SVGs mestres:
#   public/icon.svg          → Ícone principal (Badge Esmeralda + Haltere Branco)
#   public/maskable-icon.svg → Ícone com safe-zone contínuo para Android Maskable
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ICONS_DIR="$ROOT_DIR/public/icons"
SPLASH_DIR="$ROOT_DIR/public/splash"
SVG_ICON="$ROOT_DIR/public/icon.svg"
SVG_MASKABLE="$ROOT_DIR/public/maskable-icon.svg"

BG_COLOR='#09090b'
MAGICK_CMD="magick"

# Fallback para ImageMagick legado (convert)
if ! command -v $MAGICK_CMD &>/dev/null && command -v convert &>/dev/null; then
  MAGICK_CMD="convert"
fi

echo "╔══════════════════════════════════════════════════════╗"
echo "║     Geração de Assets PWA - Registro de Treinos      ║"
echo "╚══════════════════════════════════════════════════════╝"

# ─── Verificação de dependências ────────────────────────────
if ! command -v $MAGICK_CMD &>/dev/null; then
  echo "❌ ImageMagick não encontrado. Instale com:"
  echo "   sudo apt install imagemagick   (Linux)"
  echo "   brew install imagemagick       (macOS)"
  exit 1
fi

# ─── Criação de diretórios ──────────────────────────────────
mkdir -p "$ICONS_DIR" "$SPLASH_DIR"

# ═══════════════════════════════════════════════════════════════
# 1. APPLE TOUCH ICONS (PNG, fundo transparente / squircle nativo)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📱 Gerando apple-touch-icons..."

generate_apple_icon() {
  local size="$1"
  local output="$2"
  echo "   → ${size}px  →  $output"
  $MAGICK_CMD -background none "$SVG_ICON" -resize "${size}x${size}" "$output"
}

generate_apple_icon 180 "$ICONS_DIR/apple-touch-icon-180x180.png"
generate_apple_icon 180 "$ICONS_DIR/apple-touch-icon.png"
generate_apple_icon 167 "$ICONS_DIR/apple-touch-icon-167x167.png"
generate_apple_icon 152 "$ICONS_DIR/apple-touch-icon-152x152.png"
generate_apple_icon 120 "$ICONS_DIR/apple-touch-icon-120x120.png"
generate_apple_icon  76 "$ICONS_DIR/apple-touch-icon-76x76.png"

echo "   ✅ 6 apple-touch-icons gerados"

# ═══════════════════════════════════════════════════════════════
# 2. PWA MANIFEST ICONS (any = master | maskable = safe-zone)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📦 Gerando ícones do manifest..."

generate_pwa_icon() {
  local size="$1"
  local svg="$2"
  local output="$3"
  echo "   → ${size}px  →  $output"
  $MAGICK_CMD -background none "$svg" -resize "${size}x${size}" "$output"
}

# Ícones 'any'
generate_pwa_icon 192 "$SVG_ICON"       "$ICONS_DIR/pwa-192x192.png"
generate_pwa_icon 512 "$SVG_ICON"       "$ICONS_DIR/pwa-512x512.png"

# Ícones 'maskable'
generate_pwa_icon 192 "$SVG_MASKABLE"   "$ICONS_DIR/pwa-192x192-maskable.png"
generate_pwa_icon 512 "$SVG_MASKABLE"   "$ICONS_DIR/pwa-512x512-maskable.png"

# Fallbacks raiz legados
generate_pwa_icon 192 "$SVG_ICON"       "$ROOT_DIR/public/icon-192.png"
generate_pwa_icon 512 "$SVG_ICON"       "$ROOT_DIR/public/icon-512.png"
generate_pwa_icon 512 "$SVG_ICON"       "$ROOT_DIR/public/logo.png"

echo "   ✅ 4 ícones PWA principais + 3 fallbacks raiz gerados"

# ═══════════════════════════════════════════════════════════════
# 3. SPLASH SCREENS (iOS Standalone Mode)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🌅 Gerando splash screens (Dark Zinc 950)..."

generate_splash() {
  local width="$1"
  local height="$2"
  local logo_size="$3"
  local output="$4"
  echo "   → ${width}x${height}  →  $output"
  $MAGICK_CMD "$SVG_ICON" -resize "${logo_size}x${logo_size}" \
    -background "$BG_COLOR" -gravity center -extent "${width}x${height}" "$output"
}

generate_splash 1290 2796 260 "$SPLASH_DIR/iphone_430x932@3x.png"
generate_splash 1170 2532 240 "$SPLASH_DIR/iphone_390x844@3x.png"
generate_splash  750 1334 180 "$SPLASH_DIR/iphone_375x667@2x.png"
generate_splash 2048 2732 320 "$SPLASH_DIR/ipad_1024x1366@2x.png"
generate_splash 1668 2388 280 "$SPLASH_DIR/ipad_834x1194@2x.png"

echo "   ✅ 5 splash screens geradas"

# ═══════════════════════════════════════════════════════════════
# 4. RESUMO
# ═══════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════"
echo "📊 Resumo:"
echo "   Ícones:     $(ls -1 "$ICONS_DIR"/*.png 2>/dev/null | wc -l) arquivos em public/icons/"
echo "   Splash:     $(ls -1 "$SPLASH_DIR"/*.png 2>/dev/null | wc -l) arquivos em public/splash/"
echo "   Tamanho:    $(du -sh "$ICONS_DIR" | cut -f1) (icons) + $(du -sh "$SPLASH_DIR" | cut -f1) (splash)"
echo ""
echo "✅ Todos os assets PWA foram gerados com sucesso!"
echo "══════════════════════════════════════════════════════"
