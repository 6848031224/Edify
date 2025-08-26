// generate-file-tree.js
const fs = require('fs');
const path = require('path');

// Folder to scan (your repo root)
const ROOT_DIR = path.join(__dirname); // current folder
const OUTPUT_FILE = path.join(__dirname, 'file-tree.json');

function walk(dir, basePath = '') {
  return fs.readdirSync(dir).map(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relativePath = path.join(basePath, file).replace(/\\/g, '/');

    if (stat.isDirectory()) {
      return {
        name: file,
        type: 'dir',
        path: relativePath,
        children: walk(fullPath, relativePath)
      };
    } else {
      return {
        name: file,
        type: 'file',
        path: relativePath
      };
    }
  });
}

// Generate JSON
const tree = walk(ROOT_DIR);

// Save to file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tree, null, 2));
console.log(`file-tree.json generated at ${OUTPUT_FILE}`);
