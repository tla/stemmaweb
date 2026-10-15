// Node-side helpers for checking files the browser downloads during a test.
// Used by the `clearDownloads` and `listDownloads` tasks registered in cypress.config.js.
const fs = require('node:fs');
const path = require('node:path');

/** Remove everything from the downloads folder, so a test sees only its own downloads. */
function clearDownloads(folder) {
  if (fs.existsSync(folder)) {
    for (const name of fs.readdirSync(folder)) fs.rmSync(path.join(folder, name), { recursive: true, force: true });
  }
  return null;
}

/** The files in the downloads folder: name, size and the first bytes (hex, and as text). */
function listDownloads(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).sort().map((name) => {
    const file = path.join(folder, name);
    const data = fs.readFileSync(file);
    return {
      name,
      size: data.length,
      headHex: data.subarray(0, 8).toString('hex'),
      text: data.subarray(0, 4000).toString('utf8')
    };
  });
}

module.exports = { clearDownloads, listDownloads };
