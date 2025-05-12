/**
 * Script per generare tutte le icone PWA necessarie
 * 
 * Istruzioni:
 * 1. Esegui questo script con Node.js
 * 2. Le icone verranno generate nella cartella corrente
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definizione dell'icona SVG di base
const createBaseSvg = (size) => {
  const fontSize = Math.floor(size * 0.4); // Dimensione del testo proporzionale
  const yPos = Math.floor(size * 0.65); // Posizione Y del testo proporzionale
  const borderRadius = Math.floor(size * 0.15); // Border radius proporzionale
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#4a6cf7" rx="${borderRadius}" ry="${borderRadius}"/>
  <text x="${size/2}" y="${yPos}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle" fill="white" font-weight="bold">SS</text>
</svg>`;
};

// Dimensioni delle icone richieste per PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Genera l'icona per ogni dimensione
sizes.forEach(size => {
  const svgContent = createBaseSvg(size);
  const filename = `icon-${size}x${size}.svg`;
  
  fs.writeFileSync(path.join(__dirname, filename), svgContent);
  console.log(`Generata icona ${filename}`);
});

// Genera anche un badge per le notifiche
const badgeSvgContent = createBaseSvg(72);
fs.writeFileSync(path.join(__dirname, 'badge-72x72.svg'), badgeSvgContent);
console.log('Generata badge icon badge-72x72.svg');

console.log('Tutte le icone SVG sono state generate con successo!');
console.log('Per convertire le icone SVG in PNG, utilizza un servizio online o ImageMagick.');