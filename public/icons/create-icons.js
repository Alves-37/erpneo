// Script para criar ícones básicos
const fs = require('fs');
const path = require('path');

// Criar um PNG base64 simples (ícone azul com "ERP")
const createBasicIcon = (size) => {
  const canvas = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size/8}" fill="#0f172a"/>
  <rect x="${size/8}" y="${size/8}" width="${size*3/4}" height="${size*3/4}" rx="${size/12}" fill="#0ea5e9" fill-opacity="0.2"/>
  <text x="${size/2}" y="${size/2}" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="${size/4}" font-weight="bold" fill="#0ea5e9">ERP</text>
  <text x="${size/2}" y="${size*2/3}" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="${size/12}" fill="#64748b">CRM</text>
</svg>`;
  return canvas;
};

// Criar ícones em diferentes tamanhos
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'icons');

console.log('🎨 Criando ícones básicos...');

sizes.forEach(size => {
  const svg = createBasicIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Criado: ${filename}`);
});

console.log('🎉 Ícones criados com sucesso!');
console.log('📁 Pasta:', iconsDir);
