// Metro config for this pnpm monorepo. Lets Metro resolve packages hoisted to the
// workspace root (.pnpm store) and honour "exports" maps (needed by @supabase/*).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// @supabase/supabase-js and its sub-packages resolve via "exports".
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
