/**
 * Generate PWA icons for Unbind.
 * Usage: npx tsx scripts/generate-icons.ts
 *
 * Creates icon-192x192.png, icon-512x512.png, and maskable-icon-512x512.png
 * in public/icons/ with the Unbind infinity mark on dark navy background.
 */

import * as fs from 'fs'
import * as path from 'path'

// We'll create a minimal valid PNG programmatically
// since canvas may not be available. This uses raw PNG encoding.

function createPNG(width: number, height: number, pixels: Buffer): Buffer {
  const zlib = require('zlib')

  // Add filter byte (0 = None) to each row
  const rawData = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0 // filter: None
    pixels.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }

  const compressed = zlib.deflateSync(rawData)

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeB = Buffer.from(type, 'ascii')
    const crcData = Buffer.concat([typeB, data])
    const crc = Buffer.alloc(4)
    crc.writeInt32BE(crc32(crcData), 0)
    return Buffer.concat([len, typeB, data, crc])
  }

  // CRC32 table
  const crcTable: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    crcTable[n] = c
  }
  function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
    }
    return (crc ^ 0xFFFFFFFF) | 0
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function renderIcon(size: number, maskable: boolean): Buffer {
  const pixels = Buffer.alloc(size * size * 4)

  // Background: #0a0f1e
  const bgR = 10, bgG = 15, bgB = 30

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = bgR
    pixels[i * 4 + 1] = bgG
    pixels[i * 4 + 2] = bgB
    pixels[i * 4 + 3] = 255
  }

  // Draw infinity symbol (∞) in white/cyan
  const cx = size / 2
  const cy = size / 2
  const padding = maskable ? size * 0.25 : size * 0.2
  const lobeW = (size - padding * 2) / 2.8
  const lobeH = lobeW * 0.55
  const lineThickness = Math.max(size * 0.06, 3)

  function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || px >= size || py < 0 || py >= size) return
    const idx = (py * size + px) * 4
    // Alpha blend
    const srcA = a / 255
    const dstA = pixels[idx + 3] / 255
    const outA = srcA + dstA * (1 - srcA)
    if (outA > 0) {
      pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA)
      pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA)
      pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA)
      pixels[idx + 3] = Math.round(outA * 255)
    }
  }

  // Draw thick ellipse outline
  function drawEllipse(ecx: number, ecy: number, rx: number, ry: number, thickness: number) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.002) {
      for (let t = -thickness / 2; t <= thickness / 2; t += 0.5) {
        const x = ecx + (rx + t) * Math.cos(angle)
        const y = ecy + (ry + t * ry / rx) * Math.sin(angle)
        // Gradient from white to cyan
        const ratio = (Math.cos(angle) + 1) / 2
        const r = Math.round(255 * ratio + 58 * (1 - ratio))
        const g = Math.round(255 * ratio + 173 * (1 - ratio))
        const b = Math.round(255 * ratio + 207 * (1 - ratio))
        setPixel(x, y, r, g, b, 255)
      }
    }
  }

  // Left lobe
  drawEllipse(cx - lobeW * 0.55, cy, lobeW * 0.55, lobeH, lineThickness)
  // Right lobe
  drawEllipse(cx + lobeW * 0.55, cy, lobeW * 0.55, lobeH, lineThickness)

  // Draw "UNBIND" text below (only for 512)
  // Skip text — keep it clean icon-only

  return createPNG(size, size, pixels)
}

function main() {
  const outDir = path.join(process.cwd(), 'public', 'icons')
  fs.mkdirSync(outDir, { recursive: true })

  console.log('Generating PWA icons...')

  const icon192 = renderIcon(192, false)
  fs.writeFileSync(path.join(outDir, 'icon-192x192.png'), icon192)
  console.log(`  icon-192x192.png — ${icon192.length} bytes`)

  const icon512 = renderIcon(512, false)
  fs.writeFileSync(path.join(outDir, 'icon-512x512.png'), icon512)
  console.log(`  icon-512x512.png — ${icon512.length} bytes`)

  const maskable = renderIcon(512, true)
  fs.writeFileSync(path.join(outDir, 'maskable-icon-512x512.png'), maskable)
  console.log(`  maskable-icon-512x512.png — ${maskable.length} bytes`)

  console.log('Done!')
}

main()
