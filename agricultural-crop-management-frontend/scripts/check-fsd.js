import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const rank = new Map(layers.map((layer, index) => [layer, index]));
const legacySegments = new Set(['components', 'hooks', 'services']);
const sourceExtensions = new Set(['.ts', '.tsx']);
const baselinePath = path.join(projectRoot, '.fsd-import-baseline.json');

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'generated', 'build', 'dist'].includes(entry.name)) return [];
      return walk(target);
    }
    return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
  });
}

function layerFromAbsolute(filePath) {
  const relative = path.relative(sourceRoot, filePath).replaceAll('\\', '/');
  const firstSegment = relative.split('/')[0];
  return rank.has(firstSegment) ? firstSegment : null;
}

function layerFromSpecifier(importer, specifier) {
  const aliasMatch = specifier.match(/^@\/?(app|pages|widgets|features|entities|shared)(?:\/|$)/);
  if (aliasMatch) return aliasMatch[1];
  if (specifier.startsWith('@/')) {
    const segment = specifier.slice(2).split('/')[0];
    return rank.has(segment) ? segment : null;
  }
  if (specifier.startsWith('.')) {
    return layerFromAbsolute(path.resolve(path.dirname(importer), specifier));
  }
  return null;
}

const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const violations = [];

for (const file of walk(sourceRoot)) {
  const importerLayer = layerFromAbsolute(file);
  const relativeFile = path.relative(projectRoot, file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');

  if (legacySegments.has(relativeFile.split('/')[1])) {
    violations.push(`${relativeFile}: file nằm trong legacy folder`);
  }

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;
    if (/^@\/(components|hooks|services)(?:\/|$)/.test(specifier)) {
      violations.push(`${relativeFile}: legacy import '${specifier}'`);
      continue;
    }
    const targetLayer = layerFromSpecifier(file, specifier);
    if (!importerLayer || !targetLayer) continue;
    if (rank.get(importerLayer) < rank.get(targetLayer)) {
      violations.push(`${relativeFile}: ${importerLayer} không được import ${targetLayer} ('${specifier}')`);
    }
  }
}

const uniqueViolations = [...new Set(violations)].sort();

if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify({ version: 1, violations: uniqueViolations }, null, 2)}\n`,
    'utf8',
  );
  console.log(`FSD baseline updated: ${uniqueViolations.length} reviewed exceptions.`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error('Missing .fsd-import-baseline.json; review rồi chạy npm run check:fsd:update.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const reviewed = new Set(baseline.violations ?? []);
const newViolations = uniqueViolations.filter((violation) => !reviewed.has(violation));
if (newViolations.length > 0) {
  console.error(`FSD check failed với ${newViolations.length} vi phạm mới:`);
  newViolations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

const resolved = [...reviewed].filter((violation) => !uniqueViolations.includes(violation));
console.log(
  `FSD check passed: ${walk(sourceRoot).length} source files, ${uniqueViolations.length} reviewed exceptions, 0 vi phạm mới.`,
);
if (resolved.length > 0) {
  console.log(`${resolved.length} baseline exception đã được sửa; cập nhật baseline sau review.`);
}
