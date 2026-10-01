// Builds everything needed to put wavelink on a shared PHP host (InfinityFree):
//
//   deploy/out/htdocs/     upload the CONTENTS of this folder into the site's htdocs/
//   deploy/out/database.sql  import once in phpMyAdmin
//
// Run from the repo root:  node deploy/build.mjs
// It only reads the project and writes inside deploy/out/ (gitignored).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'deploy', 'out');
const htdocs = join(out, 'htdocs');
const settings = join(root, 'deploy', 'local.production.php');
const problems = [];

rmSync(out, { recursive: true, force: true });
mkdirSync(htdocs, { recursive: true });

// 1. Production build of the React app. Vite reads frontend/.env.production,
//    where VITE_API_URL sets the API's address.
console.log('Building the frontend (npm run build)…');
execSync('npm run build', { cwd: join(root, 'frontend'), stdio: 'inherit' });
cpSync(join(root, 'frontend', 'dist'), htdocs, { recursive: true });

// 2. The PHP backend, next to index.html. Never the local settings, the local
//    uploads or the schema folder.
for (const dir of ['api', 'includes']) cpSync(join(root, 'backend', dir), join(htdocs, dir), { recursive: true });
mkdirSync(join(htdocs, 'config'));
for (const file of ['config.php', 'database.php', 'cors.php']) cpSync(join(root, 'backend', 'config', file), join(htdocs, 'config', file));
for (const file of ['.htaccess', '.user.ini']) cpSync(join(root, 'backend', file), join(htdocs, file));

// 3. Empty upload folders. Uploads are only ever saved as images with random
//    names; this also stops the folder serving a script, whatever ends up there.
const noScripts = 'Options -Indexes\nRewriteEngine On\nRewriteRule \\.(php\\d?|phtml|phar|cgi|pl|py)$ - [F,NC]\n';
for (const dir of ['posts', 'avatars']) {
  mkdirSync(join(htdocs, 'uploads', dir), { recursive: true });
  writeFileSync(join(htdocs, 'uploads', dir, 'index.html'), ''); // keeps the folder when uploading, and hides its listing
}
writeFileSync(join(htdocs, 'uploads', '.htaccess'), noScripts);

// 4. Live settings: deploy/local.production.php (gitignored) -> config/local.php.
if (existsSync(settings)) {
  const text = readFileSync(settings, 'utf8');
  const placeholders = ['sqlXXX', 'XXXXXXXX', 'YOUR_HOSTING_ACCOUNT_PASSWORD', 'PASTE_64_RANDOM_CHARACTERS_HERE', 'YOUR-SITE'].filter((p) => text.includes(p));
  if (placeholders.length) problems.push(`deploy/local.production.php still has placeholder values: ${placeholders.join(', ')}`);
  cpSync(settings, join(htdocs, 'config', 'local.php'));
} else {
  problems.push('deploy/local.production.php not found: copy deploy/local.production.example.php to it and fill it in (or create config/local.php on the server yourself)');
}

// 5. Database script for phpMyAdmin. The host creates the database itself, so
//    the CREATE DATABASE / USE lines go; tables get an explicit utf8mb4 charset
//    because the host's default may not handle emoji.
let sql = readFileSync(join(root, 'backend', 'database', 'schema.sql'), 'utf8').replace(/\r\n/g, '\n');
const before = sql;
sql = sql.replace(/^CREATE DATABASE .*;\n/m, '').replace(/^USE .*;\n/m, '');
const tables = (sql.match(/\) ENGINE=InnoDB;/g) || []).length;
sql = sql.replace(/\) ENGINE=InnoDB;/g, ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
if (sql === before || /CREATE DATABASE|^USE /m.test(sql) || tables !== 7) problems.push(`schema.sql didn't convert as expected (${tables} tables found, 7 expected)`);
writeFileSync(join(out, 'database.sql'), `-- wavelink tables for a hosted database (import in phpMyAdmin).\n-- Generated from backend/database/schema.sql by deploy/build.mjs.\nSET NAMES utf8mb4;\n${sql.replace(/^-- Wavelink schema.*\n-- Load with.*\n/, '')}`);

// 6. Checks on what will be uploaded.
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const all = files(htdocs);
const built = all.filter((f) => /[\\/]assets[\\/].*\.js$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
for (const dev of ['backend.test', 'localhost:8000', '127.0.0.1:8090']) {
  if (built.includes(dev)) problems.push(`the built app still points at ${dev}: check VITE_API_URL in frontend/.env.production`);
}
if (!existsSync(join(htdocs, 'index.html'))) problems.push('index.html is missing from the build');
const devSettings = join(root, 'backend', 'config', 'local.php');
if (existsSync(join(htdocs, 'config', 'local.php')) && existsSync(devSettings)
    && readFileSync(join(htdocs, 'config', 'local.php'), 'utf8') === readFileSync(devSettings, 'utf8')) {
  problems.push('config/local.php in the upload folder is your LOCAL settings file; it must be the live one');
}
const apiUrl = (readFileSync(join(root, 'frontend', '.env.production'), 'utf8').match(/^VITE_API_URL=(.*)$/m) || [])[1];

console.log(`\nReady in deploy/out/ (${all.length} files in htdocs):`);
console.log(`  API URL built into the app (VITE_API_URL): ${apiUrl}`);
console.log(`  config/local.php (live settings): ${existsSync(join(htdocs, 'config', 'local.php')) ? 'included' : 'NOT included'}`);
console.log(`  database.sql: ${tables} tables`);
if (problems.length) {
  console.log('\nFix before uploading:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nNo problems found. Upload the contents of deploy/out/htdocs/ into htdocs/ on the host.');
}
