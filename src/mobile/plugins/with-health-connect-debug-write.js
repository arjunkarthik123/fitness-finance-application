// Adds Health Connect write permissions to the Android *debug* manifests only, so
// the dev-only seed tool (src/integrations/healthConnectSeed.ts) can insert test
// data. Release builds merge only the main manifest and never get write access:
// Flexin must stay read-only (least privilege, SC-04: no manual step entry).
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const WRITE_PERMISSIONS = [
  'android.permission.health.WRITE_STEPS',
  'android.permission.health.WRITE_EXERCISE',
];

// Build types Android merges src/<type>/AndroidManifest.xml into; never "release".
const DEBUG_BUILD_TYPES = ['debug', 'debugOptimized'];

function addPermissions(manifest) {
  const missing = WRITE_PERMISSIONS.filter((name) => !manifest.includes(`"${name}"`));
  if (missing.length === 0) {
    return manifest;
  }
  const lines = missing.map((name) => `    <uses-permission android:name="${name}"/>\n`).join('');
  return manifest.replace(/(\s*<application\b)/, `\n${lines}$1`);
}

module.exports = function withHealthConnectDebugWrite(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      for (const buildType of DEBUG_BUILD_TYPES) {
        const file = path.join(
          config.modRequest.platformProjectRoot,
          'app',
          'src',
          buildType,
          'AndroidManifest.xml',
        );
        if (fs.existsSync(file)) {
          fs.writeFileSync(file, addPermissions(fs.readFileSync(file, 'utf8')));
        }
      }
      return config;
    },
  ]);
};
