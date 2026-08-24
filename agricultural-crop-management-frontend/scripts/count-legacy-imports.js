import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const baselinePath = path.join(projectRoot, '.legacy-import-baseline.json');
const legacyNames = ['components', 'hooks', 'services'];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return ['.ts', '.tsx'].includes(path.extname(entry.name)) ? [target] : [];
  });
}

function currentState() {
  const legacyFiles = Object.fromEntries(
    legacyNames.map((name) => [name, walk(path.join(sourceRoot, name)).length]),
  );
  const importCounts = Object.fromEntries(legacyNames.map((name) => [name, 0]));
  for (const file of walk(sourceRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const name of legacyNames) {
      importCounts[name] += source.match(new RegExp(`@/${name}(?:/|['"])`, 'g'))?.length ?? 0;
    }
  }
  return {
    version: 1,
    legacyFiles,
    importCounts,
    total: Object.values(legacyFiles).reduce((sum, value) => sum + value, 0)
      + Object.values(importCounts).reduce((sum, value) => sum + value, 0),
  };
}

const state = currentState();
const args = new Set(process.argv.slice(2));

if (args.has('--update-baseline')) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  console.log(`Legacy baseline updated: ${state.total}`);
  process.exit(0);
}

console.log(JSON.stringify(state, null, 2));

if (args.has('--check')) {
  if (!fs.existsSync(baselinePath)) {
    console.error('Missing .legacy-import-baseline.json; review rồi chạy npm run check:legacy:update.');
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const increased = state.total > baseline.total
    || legacyNames.some((name) => state.legacyFiles[name] > baseline.legacyFiles[name])
    || legacyNames.some((name) => state.importCounts[name] > baseline.importCounts[name]);
  if (increased) {
    console.error(`Legacy debt tăng từ ${baseline.total} lên ${state.total}.`);
    process.exit(1);
  }
  console.log(`Legacy baseline check passed: ${state.total}/${baseline.total}.`);
}
