const fs = require('fs');
const path = require('path');

/**
 * afterPack hook - runs after electron-builder packages the app.
 * Deletes unused Chromium locale files (saves ~45MB).
 */
exports.default = async function afterPack(context) {
  const keepLocales = new Set(['he.pak', 'en-US.pak']);
  const localesDir = path.join(context.appOutDir, 'locales');

  if (!fs.existsSync(localesDir)) return;

  const files = fs.readdirSync(localesDir);
  let deleted = 0;
  let savedBytes = 0;

  for (const file of files) {
    if (!keepLocales.has(file)) {
      const filePath = path.join(localesDir, file);
      const size = fs.statSync(filePath).size;
      fs.unlinkSync(filePath);
      deleted++;
      savedBytes += size;
    }
  }

  console.log(`  • afterPack: removed ${deleted} locale files, saved ${Math.round(savedBytes / 1024 / 1024)}MB`);
};
