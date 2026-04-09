const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Navy background
  ctx.fillStyle = '#0a0f1e';
  ctx.fillRect(0, 0, size, size);

  // Draw infinity symbol centered
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.15;
  const d = size * 0.18;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left circle of infinity
  ctx.beginPath();
  ctx.arc(cx - d, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Right circle of infinity
  ctx.beginPath();
  ctx.arc(cx + d, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Amber dot accent
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.arc(cx + d + r * 0.6, cy - r * 0.6, size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

fs.mkdirSync('public/icons', { recursive: true });

fs.writeFileSync(path.join('public/icons', 'icon-192.png'), generateIcon(192));
fs.writeFileSync(path.join('public/icons', 'icon-512.png'), generateIcon(512));

// Also write to the old filenames for backwards compat
fs.writeFileSync(path.join('public/icons', 'icon-192x192.png'), generateIcon(192));
fs.writeFileSync(path.join('public/icons', 'icon-512x512.png'), generateIcon(512));
fs.writeFileSync(path.join('public/icons', 'maskable-icon-512x512.png'), generateIcon(512));

console.log('Icons generated successfully');
