import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'cypress', 'fixtures', 'demo', 'images');
const PRINTS = [
  { id: 1, imageId: 28, name: 'llamas' },
  { id: 6, imageId: 26, name: 'gourd' },
  { id: 50, imageId: 8, name: 'trophy' },
  { id: 177, imageId: 129, name: 'oculus' },
  { id: 2, imageId: 10, name: 'cat-headbands' },
];

fs.mkdirSync(OUT, { recursive: true });
for (const p of PRINTS) {
  const res = await fetch(
    `https://api.3dprintlog.com/api/Prints/${p.id}/image/${p.imageId}`,
    { headers: { 'allow-anonymous-request': 'true' } }
  );
  if (!res.ok) throw new Error(`print ${p.id} image ${p.imageId} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) {
    throw new Error(`print ${p.id} image is ${buf.length} bytes — likely a 48x48 thumbnail; pick another older print`);
  }
  fs.writeFileSync(path.join(OUT, `${p.name}.jpg`), buf);
  console.log(`${p.name}.jpg  ${buf.length} bytes`);
}
