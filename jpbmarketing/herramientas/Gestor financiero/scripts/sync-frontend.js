'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'web');
const FILES = ['index.html', 'app.js', 'styles.css', 'tauri-bridge.js', 'manifest.json', 'sw.js', 'push-client.js', 'sync-client.js', 'emo-core.js', 'diario-emocional.js', 'conflex-card.js', 'gcal-sync.js', 'notas.js', 'sii-data.js', 'sii-module.js'];

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

fs.mkdirSync(WEB_DIR, { recursive: true });
for (const file of FILES) {
  fs.copyFileSync(path.join(ROOT, file), path.join(WEB_DIR, file));
}

copyDirRecursive(path.join(ROOT, 'icons'), path.join(WEB_DIR, 'icons'));
copyDirRecursive(path.join(ROOT, 'functions'), path.join(WEB_DIR, 'functions'));

console.log(`[sync-frontend] copiados ${FILES.length} archivos + íconos + functions a web/`);
