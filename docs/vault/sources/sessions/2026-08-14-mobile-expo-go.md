---
title: Getting Planora onto a physical iPhone, and a 9B fine-tune attempt
tags: [session, mobile, expo, fine-tune]
source: "self"
date: 2026-08-14
status: active
---

# Session — 2026-08-14

Two threads: making the Expo app actually run on an iPhone 15 running iOS 26.6
via Expo Go, and fine-tuning a companion model on an 8 GB RTX 3060 Ti.

## Thread 1 — mobile

The app did not run at all at the start of the session. It failed at five
distinct points, each with a different cause. Each was diagnosed from the
device's own error rather than guessed:

| Failure | Cause |
|---|---|
| `Project is incompatible with this version of Expo Go` | repo targeted a newer SDK than the installed Expo Go |
| `SyntaxError: private properties are not supported` | Hermes on this Expo Go lacks `#private` fields |
| `ReferenceError: Property 'DOMException' doesn't exist` | `class X extends Error` subclassing unsupported |
| `Cannot read property 'useState' of null` | two React copies — see [[bugs/duplicate-react-in-npm-workspace.md]] |
| `_this._updateBottomIfNecessary is not a function` | RN's `KeyboardAvoidingView` class fields reordered by Babel class lowering |
| `loadEverything is not a function` | `useCallback` referenced before definition |

Outcome: **the app runs on the device.** Login, navigation and the companion
were exercised by the user on hardware.

### What was not measured

- No performance profiling on device — `NOT MEASURED`
- No testing on Android — `NOT DONE`
- No testing on any iOS version other than 26.6 — `NOT DONE`

## Thread 2 — fine-tune

Attempts to QLoRA-tune a 9B on 8 GB of VRAM. See
[[decisions/2026-08-14-fine-tune-on-8gb.md]] for what the card can and cannot
do and why.

## Related
- [[decisions/2026-08-14-pin-mobile-to-expo-sdk-54.md]]
- [[bugs/duplicate-react-in-npm-workspace.md]]
- [[bugs/icon-font-never-loads-in-expo-go.md]]
- [[decisions/2026-08-14-fine-tune-on-8gb.md]]
