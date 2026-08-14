const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// This app lives in an npm workspace, so its dependencies are split across two
// node_modules trees: npm hoists most packages to the repo root, but keeps a
// nested copy whenever versions differ between workspaces.
//
// That split produced a genuinely confusing failure. `react-native` is hoisted
// to the root, so it resolved React from the root copy (19.2.3, the version the
// web app pins). Application code under apps/mobile resolved the nested copy
// (19.1.0, the version Expo SDK 54 expects). Two React instances share no
// dispatcher, so every hook call failed with:
//   Invalid hook call ... Cannot read property 'useState' of null
//
// Watching both trees and pinning the singletons to one path each keeps the
// renderer and the components on the same instance.
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

// Packages that break if more than one copy is ever loaded. Resolving these by
// absolute path removes the ambiguity entirely rather than relying on which
// directory a given importer happens to sit in.
const singletons = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(workspaceRoot, "node_modules/react-native")
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singletonRoot = singletons[moduleName];
  if (singletonRoot) {
    return context.resolveRequest(
      { ...context, nodeModulesPaths: [] },
      singletonRoot,
      platform
    );
  }
  // Subpath imports such as `react/jsx-runtime` must follow the same copy.
  for (const [name, root] of Object.entries(singletons)) {
    if (moduleName.startsWith(`${name}/`)) {
      return context.resolveRequest(
        { ...context, nodeModulesPaths: [] },
        path.join(root, moduleName.slice(name.length + 1)),
        platform
      );
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
