const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// pnpm stores packages in a virtual store (.pnpm/) instead of hoisting them.
// Metro needs to resolve packages from that virtual store.
const pnpmVirtualStore = path.resolve(projectRoot, "node_modules/.pnpm");

// Collect all node_modules paths inside the pnpm virtual store
const pnpmNodeModulesPaths = [];
if (fs.existsSync(pnpmVirtualStore)) {
  const entries = fs.readdirSync(pnpmVirtualStore).filter(
    (f) => f !== "node_modules" && f !== ".modules.yaml"
  );
  for (const entry of entries) {
    const dir = path.join(pnpmVirtualStore, entry, "node_modules");
    if (fs.existsSync(dir)) {
      pnpmNodeModulesPaths.push(dir);
    }
  }
}

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  ...pnpmNodeModulesPaths,
];

// Enable symlinks so Metro follows pnpm's symlinked packages
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, {
  input: "./src/app/global.css",
});
