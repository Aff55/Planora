---
title: Pin mobile to Expo SDK 54 and target Hermes on an older Expo Go
tags: [mobile, expo, babel, decision]
source: "sources/sessions/2026-08-14-mobile-expo-go.md"
date: 2026-08-14
status: active
related_code: "apps/mobile/babel.config.js"
---

# Pin mobile to Expo SDK 54 and target Hermes on an older Expo Go

## Context

The goal was running Planora on a physical iPhone 15 **without paying for an
Apple Developer account** ($99/yr), which rules out a custom development build
distributed to the device. That leaves Expo Go, and Expo Go's version is
whatever the App Store offers — in this region it did not update past the SDK 54
runtime, and no amount of upgrading the repo changes what is installed on the
phone.

## Decision

Target the runtime that is actually on the device rather than the newest SDK.
Pin to **Expo SDK 54 / React Native 0.81.5 / React 19.1.0** and configure Babel
to emit JavaScript that this Hermes build can parse.

## Consequences

That Hermes build cannot parse two things modern dependencies emit freely:

1. `#private` class fields
2. `class X extends Error` (this is what made `DOMException` fail)

Both must be lowered by Babel. The working configuration is narrow and the
constraints are not obvious:

- **No top-level `plugins`.** Top-level plugins run *before* presets, so
  `transform-classes` ran before TypeScript annotations were stripped and
  produced `function UTF8Decoder(private options)` — not valid JavaScript.
  The transform belongs inside the preset chain.
- **No `assumptions`.** Enabling them changed class-field initialisation order,
  which broke React Native's own `KeyboardAvoidingView`
  (`_this._updateBottomIfNecessary is not a function`).
- Presets apply in **reverse** order, so `babel-preset-expo` is listed last in
  order to run first.

## Cost

Two RN components had to be replaced with local equivalents because lowering
them was more fragile than rewriting them: `KeyboardAvoidingView` became a
function component, and the icon font was dropped entirely
([[bugs/icon-font-never-loads-in-expo-go.md]]).

## Revisit when

Expo Go on the device updates to a newer SDK, **or** an Apple Developer account
becomes available and a development build is possible. Either removes the whole
constraint and most of this Babel configuration.

## Sources
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]

## Related
- [[bugs/duplicate-react-in-npm-workspace.md]]
