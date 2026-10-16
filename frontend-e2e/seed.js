// Node-side helpers for resetting the Stemmarest database between tests.
// Used by the `reseedDB` task registered in cypress.config.js.
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');

const run = promisify(execFile);

// Inside the e2e container the init data is mounted at cypress/.initdata4headless
// (see docker-compose.test.yml); in a local checkout it lives in ../bin.
const INIT_DATA_DIRS = [
  path.join(__dirname, 'cypress', '.initdata4headless'),
  path.join(__dirname, '..', 'bin', 'init-data', 'stemmarest')
];

function findInitScript() {
  for (const dir of INIT_DATA_DIRS) {
    const script = path.join(dir, 'init_test_data.sh');
    if (fs.existsSync(script)) return script;
  }
  throw new Error(`init_test_data.sh not found in: ${INIT_DATA_DIRS.join(', ')}`);
}

async function deleteAll(endpoint, listPath, itemPath) {
  const list = await fetch(`${endpoint}${listPath}`);
  if (!list.ok) throw new Error(`GET ${listPath} failed: ${list.status}`);
  const items = await list.json();
  await Promise.all(
    items.map(async ({ id }) => {
      const res = await fetch(`${endpoint}${itemPath}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`DELETE ${itemPath}/${id} failed: ${res.status}`);
    })
  );
}

/**
 * Delete all traditions and users, then load a test data set: "mini" (the default) or
 * "empty" (the users only, no traditions).
 */
async function reseedDB(endpoint, dataSet = 'mini') {
  await deleteAll(endpoint, '/traditions', '/tradition');
  await deleteAll(endpoint, '/users', '/user');
  const { stdout } = await run(findInitScript(), [dataSet], {
    env: { ...process.env, STEMMAREST_ENDPOINT: endpoint }
  });
  return stdout.trim().split('\n').slice(-1)[0];
}

module.exports = { reseedDB };
