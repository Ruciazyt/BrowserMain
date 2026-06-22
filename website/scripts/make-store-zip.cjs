// make-store-zip.cjs
// Build a Chrome Web Store / Edge Add-ons compliant ZIP from dist/.
// Zero-dependency STORE-mode zip writer. Uses FORWARD-slash path separators
// (required by the ZIP spec; Windows PowerShell's Compress-Archive writes
// backslashes, which can break resource lookups on the stores' Linux backend).
//
// Usage: node scripts/make-store-zip.cjs [srcDir] [outZip]
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const outZip = path.resolve(process.argv[3] || path.join(__dirname, '..', 'mytab.zip'));

// CRC32 table
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? base + '/' + name : name; // forward slashes
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, rel, out);
    else out.push({ full, rel });
  }
}

const files = [];
walk(srcDir, '', files);
files.sort((a, b) => a.rel.localeCompare(b.rel));

const chunks = [];
const central = [];
let offset = 0;

for (const f of files) {
  const data = fs.readFileSync(f.full);
  const crc = crc32(data);
  const nameBuf = Buffer.from(f.rel, 'utf8');

  const local = Buffer.alloc(30 + nameBuf.length);
  local.writeUInt32LE(0x04034b50, 0); // local file header signature
  local.writeUInt16LE(20, 4);          // version needed to extract (2.0)
  local.writeUInt16LE(0x0800, 6);      // flags: UTF-8 name
  local.writeUInt16LE(0, 8);           // compression method: store
  local.writeUInt16LE(0, 10);          // mod time
  local.writeUInt16LE(0x0021, 12);     // mod date (1980-01-01)
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18); // compressed size
  local.writeUInt32LE(data.length, 22); // uncompressed size
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);          // extra field length
  chunks.push(local, nameBuf, data);

  const cd = Buffer.alloc(46 + nameBuf.length);
  cd.writeUInt32LE(0x02014b50, 0);     // central directory header signature
  cd.writeUInt16LE(20, 4);             // version made by
  cd.writeUInt16LE(20, 6);             // version needed
  cd.writeUInt16LE(0x0800, 8);         // flags: UTF-8 name
  cd.writeUInt16LE(0, 10);             // method: store
  cd.writeUInt16LE(0, 12);             // mod time
  cd.writeUInt16LE(0x0021, 14);        // mod date
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(data.length, 20);   // compressed size
  cd.writeUInt32LE(data.length, 24);   // uncompressed size
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt16LE(0, 30);             // extra
  cd.writeUInt16LE(0, 32);             // comment length
  cd.writeUInt16LE(0, 34);             // disk number start
  cd.writeUInt16LE(0, 36);             // internal attrs
  cd.writeUInt32LE(0, 38);             // external attrs
  cd.writeUInt32LE(offset, 42);        // offset of local header
  nameBuf.copy(cd, 46);
  central.push(cd);

  offset += local.length + nameBuf.length + data.length;
}

const cdBuf = Buffer.concat(central);
const body = Buffer.concat(chunks);
const cdStart = body.length;
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);     // end of central directory signature
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cdBuf.length, 12);
eocd.writeUInt32LE(cdStart, 16);
eocd.writeUInt16LE(0, 20);

fs.writeFileSync(outZip, Buffer.concat([body, cdBuf, eocd]));
console.log(`Wrote ${outZip}`);
console.log(`${files.length} entries, ${fs.statSync(outZip).size} bytes`);
