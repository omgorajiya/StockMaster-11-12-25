const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SOURCE_DIRS = ['app', 'components', 'lib']
  .map((d) => path.join(PROJECT_ROOT, d))
  .filter((p) => fs.existsSync(p));

const EXT_CANDIDATES = [
  '',
  '.ts', '.tsx',
  '.js', '.jsx',
  '.json',
  '.css', '.scss', '.sass',
];

function walk(dir) {
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(ent.name)) continue;
      out = out.concat(walk(p));
    } else {
      if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
    }
  }
  return out;
}

function fileExistsAsModule(resolvedBase) {
  // 1) direct file candidates
  for (const ext of EXT_CANDIDATES) {
    const cand = resolvedBase + ext;
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }

  // 2) directory index candidates
  if (fs.existsSync(resolvedBase) && fs.statSync(resolvedBase).isDirectory()) {
    for (const ext of EXT_CANDIDATES) {
      const cand = path.join(resolvedBase, 'index' + ext);
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
  }

  return null;
}

function extractImports(text) {
  // Lightweight regex approach for early error surfacing (does not require TS parse).
  const imports = [];

  // import ... from 'x' / import 'x'
  const reImport = /\bimport\s+(?:[^'\"\n;]+\s+from\s+)?['\"]([^'\"]+)['\"]/g;
  let m;
  while ((m = reImport.exec(text))) imports.push(m[1]);

  // require('x')
  const reReq = /\brequire\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
  while ((m = reReq.exec(text))) imports.push(m[1]);

  return imports;
}

function resolveSpecifier(fromFile, spec) {
  // Handle @/* alias (tsconfig paths: "@/*": ["./*"])
  if (spec.startsWith('@/')) {
    const target = path.join(PROJECT_ROOT, spec.slice(2));
    return fileExistsAsModule(target);
  }

  // Relative imports
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const target = path.resolve(path.dirname(fromFile), spec);
    return fileExistsAsModule(target);
  }

  // Bare specifiers: we don't attempt full Node/Next resolution here.
  // We'll just mark them as "unverified".
  return 'UNVERIFIED_BARE_SPECIFIER';
}

function main() {
  let files = [];
  for (const d of SOURCE_DIRS) files = files.concat(walk(d));

  const missing = [];
  const unverifiedBare = new Map();

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const specs = extractImports(text);

    for (const spec of specs) {
      const res = resolveSpecifier(f, spec);
      if (res === null) {
        missing.push({ file: path.relative(PROJECT_ROOT, f), spec });
      } else if (res === 'UNVERIFIED_BARE_SPECIFIER') {
        unverifiedBare.set(spec, (unverifiedBare.get(spec) || 0) + 1);
      }
    }
  }

  console.log('MISSING_IMPORTS_TOTAL=' + missing.length);
  for (const m of missing) {
    console.log('MISSING_IMPORT ' + m.file + ' -> ' + m.spec);
  }

  // Not an error, but useful signal for what we did not validate.
  console.log('UNVERIFIED_BARE_SPECIFIERS_TOTAL=' + unverifiedBare.size);
  const topBare = Array.from(unverifiedBare.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
  for (const [spec, count] of topBare) {
    console.log('UNVERIFIED_BARE ' + spec + ' (count=' + count + ')');
  }

  process.exitCode = missing.length ? 2 : 0;
}

main();
