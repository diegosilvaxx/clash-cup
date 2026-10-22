import { readFile, writeFile } from 'node:fs/promises';

const catalog = JSON.parse(
  await readFile(new URL('../packages/rewards/src/catalog.json', import.meta.url), 'utf8'),
);
const ids = new Set();
for (const item of catalog) {
  if (
    !/^[a-z0-9_]+$/.test(item.id) ||
    ids.has(item.id) ||
    !Number.isSafeInteger(item.price) ||
    item.price < 0
  )
    throw new Error('Invalid shop catalog');
  ids.add(item.id);
}
const path = new URL('../firebase/firestore.rules', import.meta.url);
const source = await readFile(path, 'utf8');
const generated = [
  '    // BEGIN GENERATED SHOP PRICES',
  '    function emblemPrice(id) {',
  '      return ' +
    catalog
      .filter((item) => !item.event)
      .map((item) => `id == '${item.id}' ? ${item.price}`)
      .join('\n        : ') +
    '\n        : -1;',
  '    }',
  '    // END GENERATED SHOP PRICES',
].join('\n');
if (!/ {4}\/\/ BEGIN GENERATED SHOP PRICES[\s\S]*? {4}\/\/ END GENERATED SHOP PRICES/.test(source))
  throw new Error('Shop price markers are missing');
const updated = source.replace(
  / {4}\/\/ BEGIN GENERATED SHOP PRICES[\s\S]*? {4}\/\/ END GENERATED SHOP PRICES/,
  generated,
);
if (process.argv.includes('--check')) {
  if (source.replaceAll('\r\n', '\n') !== updated.replaceAll('\r\n', '\n')) {
    console.error('Shop prices differ from the rules. Run node scripts/shop-rules.mjs.');
    process.exitCode = 1;
  } else console.log('Shop catalog and rule prices match.');
} else await writeFile(path, updated);
