import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const publicFiles = ['index.html', 'sw.js', 'manifest.webmanifest'];
const publicExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.mp3', '.ogg', '.wav']);

async function collectFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(relative));
    else if (entry.isFile() && publicExtensions.has(path.extname(entry.name).toLowerCase())) files.push(relative);
  }
  return files;
}

export async function buildPublic(outputDirectory = path.join(root, 'dist')) {
  const output = path.resolve(outputDirectory);
  const insideRoot = output.startsWith(`${root}${path.sep}`);
  if (output === root || root.startsWith(`${output}${path.sep}`) || (insideRoot && output !== path.join(root, 'dist'))) {
    throw new Error('Public build output must not overwrite repository source files. Use dist or an external output directory.');
  }
  // An explicitly supplied existing directory is only replaceable when it is a
  // build directory. This keeps accidental --out paths from deleting user work.
  try {
    if ((await stat(output)).isDirectory() && path.basename(output) !== 'dist') {
      throw new Error('An existing output directory must be named dist.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const files = [...publicFiles, ...await collectFiles('app'), ...await collectFiles('assets')];
  await mkdir(path.dirname(output), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(output), '.echoloom-public-'));
  try {
    for (const relative of files) {
      const source = path.join(root, relative);
      // Re-check real paths at the copy boundary, including the fixed files.
      if (await realpath(source) !== source) throw new Error(`Refusing a symbolic link in the public build: ${relative}`);
      const destination = path.join(staging, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
    const indexPath = path.join(staging, 'index.html');
    let html = await readFile(indexPath, 'utf8');
    html = html.replace(/<script\b[^>]*\bsrc=["'](?:\.\/)?app\/public-config\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>\s*/gi, '');
    if (!/<script\b/i.test(html)) throw new Error('The application entry point is missing its scripts.');
    html = html.replace(/<script\b/i, '<script src="app/public-config.js"></script>\n  <script');
    await writeFile(indexPath, html);
    await writeFile(path.join(staging, 'app/public-config.js'), 'window.ECHOLOOM_PUBLIC = Object.freeze({ offlineOnly: true });\n');
    const workerPath = path.join(staging, 'sw.js');
    let worker = await readFile(workerPath, 'utf8');
    if (!worker.includes('./app/public-config.js')) {
      if (!/const ASSETS\s*=\s*\[/.test(worker)) throw new Error('The service worker is missing its offline asset list.');
      worker = worker.replace(/const ASSETS\s*=\s*\[/, "const ASSETS = [\n  './app/public-config.js',");
      await writeFile(workerPath, worker);
    }
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    return { output, files: files.length + (files.includes('app/public-config.js') ? 0 : 1) };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outFlag = args.find((arg) => arg.startsWith('--out='));
  const output = outFlag?.slice('--out='.length) || (outIndex >= 0 ? args[outIndex + 1] : undefined);
  if ((outIndex >= 0 || outFlag) && (!output || !path.isAbsolute(output))) {
    throw new Error('--out requires an absolute output directory.');
  }
  const result = await buildPublic(output);
  console.log(`EchoLoom public website: ${result.output}`);
  console.log(`${result.files} public files copied; server files and private project material excluded.`);
}
