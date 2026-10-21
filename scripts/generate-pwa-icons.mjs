import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = c ^ buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ ~0) >>> 0;
}

function createPNG(width, height, getPixel) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = Math.min(255, Math.max(0, Math.round(r)));
      rawData[pxOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      rawData[pxOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
      rawData[pxOffset + 3] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'binary');
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Generate PWA Icon with brand gradient, rounded container, and Spade ♠ emblem + Gold accent
function renderIcon(size, isMaskable = false) {
  const center = size / 2;
  const radius = isMaskable ? size * 0.48 : size * 0.42;

  return createPNG(size, size, (x, y) => {
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Background gradient: dark slate #0f172a to brand blue #014373
    const bgFactor = Math.min(1, Math.max(0, (y / size)));
    let r = 15 + (1 - 15) * bgFactor;
    let g = 23 + (67 - 23) * bgFactor;
    let b = 42 + (115 - 42) * bgFactor;
    let a = 255;

    // Rounded rectangle or circle mask
    const cornerRadius = size * 0.22;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!isMaskable) {
      // Squircle bounds
      if (absX > size * 0.48 || absY > size * 0.48) {
        return [0, 0, 0, 0];
      }
      if (absX > size * 0.48 - cornerRadius && absY > size * 0.48 - cornerRadius) {
        const cDx = absX - (size * 0.48 - cornerRadius);
        const cDy = absY - (size * 0.48 - cornerRadius);
        if (Math.sqrt(cDx * cDx + cDy * cDy) > cornerRadius) {
          return [0, 0, 0, 0];
        }
      }
    }

    // Outer Gold Ring border
    const ringInner = radius * 0.88;
    const ringOuter = radius * 0.96;
    if (dist >= ringInner && dist <= ringOuter) {
      return [245, 158, 11, 255]; // #f59e0b Gold
    }

    // Center Spade ♠ shape parametric function
    // x_spade = sin(t)*cos(t), y_spade = -cos(t) - 0.3*sin(2t)
    const normX = dx / (radius * 0.55);
    const normY = (dy + size * 0.03) / (radius * 0.55);

    // Spade implicit mathematical equation:
    // (x^2 + (y - 0.2*|x|)^2) <= 0.45  OR stem base
    const spadeY = normY - 0.25 * Math.sqrt(Math.abs(normX));
    const spadeDist = normX * normX + spadeY * spadeY;

    // Stem: narrow triangular base at bottom
    const isStem = normY >= 0.2 && normY <= 0.65 && Math.abs(normX) <= (normY - 0.15) * 0.55;

    // Heart top inverted (Spade)
    const isSpadeBody = spadeDist <= 0.32 && normY <= 0.35;

    if (isSpadeBody || isStem) {
      // Gold & Sky gradient for spade symbol
      const goldFactor = Math.min(1, Math.max(0, (normY + 0.5)));
      const sR = 245 * (1 - goldFactor * 0.2);
      const sG = 158 + 40 * goldFactor;
      const sB = 11 + 200 * goldFactor;
      return [sR, sG, sB, 255];
    }

    return [r, g, b, a];
  });
}

const outDir = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

console.log('🎨 Generating PWA PNG icons...');

const icons = [
  { name: 'logo.png', size: 512, maskable: false },
];

for (const icon of icons) {
  const buf = renderIcon(icon.size, icon.maskable);
  const filePath = path.join(outDir, icon.name);
  fs.writeFileSync(filePath, buf);
  console.log(`  ✅ Generated ${icon.name} (${icon.size}x${icon.size}), size: ${buf.length} bytes`);
}

console.log('✨ Icon generation completed!');
