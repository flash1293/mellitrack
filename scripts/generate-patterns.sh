#!/bin/sh
# Generate SVG patterns as base64 data URIs for CSS background themes

generate_data_uri() {
  local svg="$1"
  # macOS uses -b0, Linux uses -w0
  if [[ "$(uname)" == "Darwin" ]]; then
    local base64=$(echo -n "$svg" | base64 -b0)
  else
    local base64=$(echo -n "$svg" | base64 -w0)
  fi
  echo "url(\"data:image/svg+xml;base64,${base64}\")"
}

# 1. Rosengarten - Floral pattern with 5-petal flowers
ROSENGARTEN_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <g opacity="0.25">
    <!-- Flower 1 (center: 30,30) -->
    <circle cx="30" cy="15" r="7" fill="#f48fb1"/>
    <circle cx="43" cy="22" r="7" fill="#f48fb1"/>
    <circle cx="40" cy="38" r="7" fill="#f48fb1"/>
    <circle cx="20" cy="38" r="7" fill="#f48fb1"/>
    <circle cx="17" cy="22" r="7" fill="#f48fb1"/>
    <circle cx="30" cy="30" r="5" fill="#f8bbd0"/>
    <!-- Flower 2 (center: 90,90) -->
    <circle cx="90" cy="75" r="9" fill="#ce93d8" opacity="0.7"/>
    <circle cx="106" cy="82" r="9" fill="#ce93d8" opacity="0.7"/>
    <circle cx="102" cy="100" r="9" fill="#ce93d8" opacity="0.7"/>
    <circle cx="78" cy="100" r="9" fill="#ce93d8" opacity="0.7"/>
    <circle cx="74" cy="82" r="9" fill="#ce93d8" opacity="0.7"/>
    <circle cx="90" cy="90" r="6" fill="#e1bee7" opacity="0.7"/>
    <!-- Small buds -->
    <circle cx="60" cy="10" r="3" fill="#f48fb1" opacity="0.5"/>
    <circle cx="10" cy="70" r="4" fill="#f48fb1" opacity="0.4"/>
    <circle cx="110" cy="40" r="3" fill="#ce93d8" opacity="0.5"/>
    <circle cx="70" cy="115" r="4" fill="#f48fb1" opacity="0.4"/>
    <circle cx="100" cy="10" r="2" fill="#f8bbd0" opacity="0.5"/>
    <circle cx="10" cy="110" r="3" fill="#ce93d8" opacity="0.4"/>
  </g>
</svg>'

echo "=== Rosengarten ==="
generate_data_uri "$ROSENGARTEN_SVG"
echo ""

# 2. Lila Ornamente - Decorative swirl/mandala pattern
LILA_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <g opacity="0.2" fill="none" stroke="#9c27b0" stroke-width="1.5">
    <!-- Ornament 1 (center) -->
    <path d="M60,15 C70,25 80,20 75,35 C70,50 55,45 60,35 C65,25 50,20 60,15Z"/>
    <path d="M60,15 C50,25 40,20 45,35 C50,50 65,45 60,35 C55,25 70,20 60,15Z"/>
    <path d="M60,105 C50,95 40,100 45,85 C50,70 65,75 60,85 C55,95 70,100 60,105Z"/>
    <path d="M60,105 C70,95 80,100 75,85 C70,70 55,75 60,85 C65,95 50,100 60,105Z"/>
    <!-- Ornament 2 (left) -->
    <path d="M15,60 C25,50 20,40 35,45 C50,50 45,65 35,60 C25,55 20,70 15,60Z"/>
    <path d="M15,60 C25,70 20,80 35,75 C50,70 45,55 35,60 C25,65 20,50 15,60Z"/>
    <!-- Ornament 3 (right) -->
    <path d="M105,60 C95,70 100,80 85,75 C70,70 75,55 85,60 C95,65 100,50 105,60Z"/>
    <path d="M105,60 C95,50 100,40 85,45 C70,50 75,65 85,60 C95,55 100,70 105,60Z"/>
    <!-- Small decorative dots -->
    <circle cx="60" cy="60" r="4" fill="#ce93d8" stroke="none" opacity="0.4"/>
    <circle cx="60" cy="30" r="2" fill="#ce93d8" stroke="none" opacity="0.3"/>
    <circle cx="60" cy="90" r="2" fill="#ce93d8" stroke="none" opacity="0.3"/>
    <circle cx="30" cy="60" r="2" fill="#ce93d8" stroke="none" opacity="0.3"/>
    <circle cx="90" cy="60" r="2" fill="#ce93d8" stroke="none" opacity="0.3"/>
  </g>
</svg>'

echo "=== Lila Ornamente ==="
generate_data_uri "$LILA_SVG"
echo ""

# 3. Herzchenregen - Heart pattern
HERZ_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <g opacity="0.2">
    <!-- Heart shape definition -->
    <!-- Big heart -->
    <path d="M50,75 C50,75 20,52 20,35 C20,24 27,16 35,16 C42,16 50,25 50,25 C50,25 58,16 65,16 C73,16 80,24 80,35 C80,52 50,75 50,75Z" fill="#e91e63"/>
    <!-- Medium heart -->
    <path d="M20,35 C20,35 5,22 5,14 C5,9 9,5 13,5 C17,5 20,10 20,10 C20,10 23,5 27,5 C31,5 35,9 35,14 C35,22 20,35 20,35Z" fill="#f06292" opacity="0.6" transform="translate(5,-2)"/>
    <!-- Small heart -->
    <path d="M40,50 C40,50 28,40 28,33 C28,28 32,24 36,24 C40,24 44,29 44,29 C44,29 48,24 52,24 C56,24 60,28 60,33 C60,40 48,50 40,50Z" fill="#f48fb1" opacity="0.5" transform="translate(30,-10)"/>
    <!-- Tiny hearts -->
    <path d="M10,20 C10,20 4,14 4,10 C4,8 6,6 8,6 C10,6 12,9 12,9 C12,9 14,6 16,6 C18,6 20,8 20,10 C20,14 14,20 10,20Z" fill="#f48fb1" opacity="0.4" transform="translate(70,55)"/>
    <path d="M10,20 C10,20 4,14 4,10 C4,8 6,6 8,6 C10,6 12,9 12,9 C12,9 14,6 16,6 C18,6 20,8 20,10 C20,14 14,20 10,20Z" fill="#f06292" opacity="0.4" transform="translate(0,60) scale(0.8)"/>
  </g>
</svg>'

echo "=== Herzchenregen ==="
generate_data_uri "$HERZ_SVG"
echo ""
