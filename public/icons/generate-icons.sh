#!/bin/bash

# Genera le icone per PWA da un'immagine SVG
# Richiede ImageMagick installato: sudo apt-get install imagemagick

# Definizione dell'icona SVG
cat > base_icon.svg << 'EOL'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512">
  <rect width="24" height="24" fill="#4a6cf7" rx="5" ry="5"/>
  <text x="12" y="16" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="white" font-weight="bold">SS</text>
  <path fill="white" d="M6,10 L18,10 M6,14 L18,14" stroke="white" stroke-width="1.5"/>
</svg>
EOL

# Dimensioni delle icone
sizes=(72 96 128 144 152 192 384 512)

# Genera icone per tutte le dimensioni
for size in "${sizes[@]}"; do
  convert -background none -size ${size}x${size} base_icon.svg icon-${size}x${size}.png
  echo "Generata icona ${size}x${size}"
done

# Crea anche l'icona badge (per notifiche)
convert -background none -size 72x72 base_icon.svg badge-72x72.png
echo "Generata badge icon 72x72"

# Pulizia
rm base_icon.svg
echo "Icone generate con successo!"