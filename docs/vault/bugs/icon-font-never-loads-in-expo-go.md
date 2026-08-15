---
title: The icon font never rendered in Expo Go, and the fix was to stop using one
tags: [mobile, expo, icons, bug]
source: "sources/sessions/2026-08-14-mobile-expo-go.md"
date: 2026-08-14
status: active
related_code: "apps/mobile/src/icon.tsx"
---

# The icon font never rendered in Expo Go, and the fix was to stop using one

## Symptom

Every icon in the mobile app rendered as blank space. Layout was correct — the
boxes were there and correctly sized — but nothing was drawn in them.

## What was ruled out (and how)

Several rounds of dependency pinning were tried and **verified as working at the
bundler level**, which is what made this confusing:

- `expo-font` pinned to 14.0.12, `expo-asset` to 12.0.13,
  `@expo/vector-icons` to `~15.0.3`
- Asset registration proved to go from 0 to 26 `__packager_asset` entries
- The TTF files proved to serve: **HTTP 200, 389 KB**

So the font was bundled, registered and served correctly. It still did not draw
on the device. The failure was in Expo Go's runtime font registration, below the
level anything in the project could reach.

## Fix

Stop shipping a font. `apps/mobile/src/icon.tsx` maps the ~53 icon names the app
uses onto Unicode glyphs the system font already has, each suffixed with
**U+FE0E** (variation selector-15) to force text presentation rather than emoji
presentation — without it iOS renders colour emoji, which looked wrong against
the theme.

Each glyph sits in a fixed square box with `includeFontPadding: false` so it
centres predictably regardless of the glyph's own metrics.

## Why this is arguably better anyway

The icons inherit `color` like text, so they follow the theme for free, and the
app ships ~389 KB lighter with one less native-registration failure mode.

## Note

Do not "fix" this by reintroducing `@expo/vector-icons` on the assumption that a
newer version resolves it. That path was measured to be correct at every layer
the project controls and still failed on the device.

## Sources
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]

## Related
- [[decisions/2026-08-14-pin-mobile-to-expo-sdk-54.md]]
