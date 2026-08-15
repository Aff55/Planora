---
title: Duplicate React in the npm workspace broke every hook on mobile
tags: [mobile, monorepo, react, metro, bug]
source: "sources/sessions/2026-08-14-mobile-expo-go.md"
date: 2026-08-14
status: active
related_code: "apps/mobile/metro.config.js"
---

# Duplicate React in the npm workspace broke every hook on mobile

## Symptom

The Expo app rendered nothing. React's own error, thrown from `App.tsx` on the
first hook call:

```
Invalid hook call. Hooks can only be called inside the body of a function component.
Cannot read property 'useState' of null
```

## Root cause

npm hoisted `react-native` to the repository root, so it resolved React from the
root copy. Application code under `apps/mobile` resolved the nested copy. Proven
by resolution rather than inference:

```
react-native  -> Planora/node_modules/react              (19.2.3)
app code      -> Planora/apps/mobile/node_modules/react  (19.1.0)
```

19.2.3 is the version the **web** app pins; 19.1.0 is what Expo SDK 54 expects.
Two React instances share no dispatcher, so `useState` read `null`.

There was **no `metro.config.js` at all**, so nothing reconciled the two trees.

## Fix

Added `apps/mobile/metro.config.js` that watches both `node_modules` directories
and pins `react` and `react-native` to one absolute path each, including subpath
imports such as `react/jsx-runtime`.

Verified in the built bundle: one React registration where there had been two.

## Why it matters beyond this instance

This is a property of npm workspaces, not of Expo. Any workspace where two
packages pin different versions of a singleton library will hoist one and nest
the other, and the failure appears far from the cause. If a future workspace is
added that pins its own React, the same pinning will be needed.

## Sources
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]

## Related
- [[decisions/2026-08-14-pin-mobile-to-expo-sdk-54.md]]
