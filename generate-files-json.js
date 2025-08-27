const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname); // current folder
const OUTPUT_FILE = path.join(ROOT_DIR, 'files.json');

// Change this if your Pages site lives in a subfolder
const BASE_URL = ''; // e.g., 'subfolder' if your site is at /subfolder

function buildTree(dir) {
  const stats = fs.statSync(dir);

  if (stats.isDirectory()) {
    return {
      name: path.basename(dir),
      type: 'folder',
      children: fs.readdirSync(dir)
        // ignore hidden files and the script itself
        .filter(name => !name.startsWith('.') && name !== 'generate-files-json.js' && name !== 'style.css' && name !== 'script.js' && name !== 'index.html')
        .map(name => buildTree(path.join(dir, name)))
    };
  } else {
    return {
      name: path.basename(dir),
      type: 'file',
      url: BASE_URL ? `${BASE_URL}/${path.relative(ROOT_DIR, dir).replace(/\\/g, '/')}` 
                    : path.relative(ROOT_DIR, dir).replace(/\\/g, '/')
    };
  }
}

const tree = buildTree(ROOT_DIR);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tree, null, 2));
console.log(`✅ files.json generated at ${OUTPUT_FILE}`);
