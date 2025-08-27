// Node.js script: walk repo and output manifest.json
// Fields: path, isDir, size, mtime
// Excludes: .git, node_modules
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const ROOT = process.cwd();

const EXCLUDES = new Set([".git", "node_modules"]);
const EXCLUDE_MATCH = [
  /^\.git($|\/)/,
  /^node_modules($|\/)/,
  /^\.cache($|\/)/,
];

async function main() {
  const files = [];
  await walk(".", files);
  const version = process.env.GITHUB_SHA || (await gitHead()) || null;
  const manifest = { version, generatedAt: new Date().toISOString(), files };
  await fsp.writeFile(path.join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Wrote manifest.json with ${files.length} entries`);
}

async function walk(rel, out) {
  const full = path.join(ROOT, rel);
  const entries = await fsp.readdir(full, { withFileTypes: true });
  for (const ent of entries) {
    const name = ent.name;
    if (EXCLUDES.has(name)) continue;
    const relPath = path.posix.join(rel.replace(/\\/g, "/"), name);
    if (EXCLUDE_MATCH.some(rx => rx.test(relPath))) continue;

    const fullPath = path.join(full, name);
    const stat = await fsp.stat(fullPath);
    if (ent.isDirectory()) {
      out.push({
        path: relPath.replace(/^\.\//, ""),
        isDir: true,
        size: 0,
        mtime: stat.mtimeMs,
      });
      await walk(relPath, out);
    } else if (ent.isFile()) {
      out.push({
        path: relPath.replace(/^\.\//, ""),
        isDir: false,
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }
  }
}

async function gitHead() {
  try {
    const head = await fsp.readFile(path.join(ROOT, ".git", "HEAD"), "utf8");
    const refMatch = head.match(/ref: (.*)/);
    if (refMatch) {
      const refPath = path.join(ROOT, ".git", refMatch[1].trim());
      return (await fsp.readFile(refPath, "utf8")).trim();
    }
    return head.trim();
  } catch {
    return null;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
