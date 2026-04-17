const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 for PNG chunks
function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(width, height, pixelGenerator) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelGenerator(x, y);
      row[1 + x * 3] = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function pixelGenerator(width, height) {
  return function(x, y) {
    const border = Math.max(1, Math.round(width / 8));
    const isBorder = x < border || x >= width - border || y < border || y >= height - border;
    if (isBorder) return [0xff, 0x95, 0x00]; // amber border

    // LED dot grid - deterministic
    const dotSpacing = Math.max(2, Math.round(width / 4));
    const dotRadius = Math.max(1, Math.round(width / 12));
    const gx = Math.floor((x - border) / dotSpacing);
    const gy = Math.floor((y - border) / dotSpacing);
    const dx = (x - border) % dotSpacing - Math.floor(dotSpacing / 2);
    const dy = (y - border) % dotSpacing - Math.floor(dotSpacing / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const seed = (gx * 7 + gy * 13) % 17;
    const isLit = seed > 5;
    const isDotArea = dist <= dotRadius;
    if (isDotArea && isLit) return [0xff, 0x95, 0x00];
    if (isDotArea && !isLit) return [0x1a, 0x15, 0x0f];

    // Letter area
    const letterArea = x >= Math.floor(width * 0.2) && x < Math.floor(width * 0.8)
                       && y >= Math.floor(height * 0.25) && y < Math.floor(height * 0.75);
    if (!letterArea) return [0x0a, 0x0a, 0x0f];

    const bx = x / width;
    const by = y / height;
    // B letter
    const inB = (bx >= 0.22 && bx <= 0.28 && by >= 0.2 && by <= 0.8)
             || (bx >= 0.28 && bx <= 0.42 && by >= 0.2 && by <= 0.28)
             || (bx >= 0.28 && bx <= 0.42 && by >= 0.72 && by <= 0.8)
             || (bx >= 0.28 && bx <= 0.42 && by >= 0.44 && by <= 0.56)
             || (bx >= 0.38 && bx <= 0.44 && by >= 0.2 && by <= 0.56)
             || (bx >= 0.38 && bx <= 0.44 && by >= 0.44 && by <= 0.8);
    if (inB) return [0xff, 0x95, 0x00];

    // M letter
    const mx = x / width;
    const my = y / height;
    const inMVert1 = mx >= 0.56 && mx <= 0.62 && my >= 0.2 && my <= 0.8;
    const inMVert2 = mx >= 0.78 && mx <= 0.84 && my >= 0.2 && my <= 0.8;
    const inMV = mx >= 0.62 && mx <= 0.78 && (
      (my >= 0.2 && my <= 0.5 - (mx - 0.62) * 0.75) ||
      (my >= 0.5 - (mx - 0.62) * 0.75 && my <= 0.5 + (mx - 0.62) * 0.75) ||
      (my >= 0.5 + (mx - 0.62) * 0.75 && my <= 0.8)
    );
    if (inMVert1 || inMVert2 || inMV) return [0xff, 0x95, 0x00];

    return [0x0a, 0x0a, 0x0f];
  };
}

const sizes = [16, 32, 48, 128];
const outDir = path.join(__dirname, '..', 'public', 'icons');

for (const size of sizes) {
  const png = createPNG(size, size, pixelGenerator(size, size));
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes)`);
}
