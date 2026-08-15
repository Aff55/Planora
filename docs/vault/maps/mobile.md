---
title: Mobile — map of content
tags: [moc, mobile, expo]
source: "self"
date: 2026-08-14
status: active
---

# Mobile — map of content

## The governing constraint

No Apple Developer account ($99/yr), therefore no custom development build,
therefore **Expo Go**, therefore whatever SDK the App Store's Expo Go supports —
which did not advance past SDK 54 in this region. Every oddity below descends
from that one fact.

- [[decisions/2026-08-14-pin-mobile-to-expo-sdk-54.md]] — the decision and the
  Babel rules it forces

## Known defects and their fixes

- [[bugs/duplicate-react-in-npm-workspace.md]] — two React copies; every hook
  returned `null`
- [[bugs/icon-font-never-loads-in-expo-go.md]] — font bundled and served
  correctly, still never drew; replaced with system glyphs

## Code that looks wrong but is deliberate

Anyone tidying `apps/mobile` should read this first, because all of it looks
like something to "clean up":

- **`babel.config.js` has no top-level `plugins` and no `assumptions`.** Both
  were tried; both broke the bundle in non-obvious ways. The comments in the
  file explain which failure each caused.
- **`KeyboardAvoider` is a hand-written function component** replacing React
  Native's `KeyboardAvoidingView`, whose class fields get reordered by class
  lowering.
- **`metro.config.js` pins `react` and `react-native` to absolute paths.**
  Deleting it reintroduces the duplicate-React failure.
- **Icons are Unicode glyphs with `U+FE0E`,** not an icon font. The variation
  selector forces text presentation; without it iOS renders colour emoji.

## Tab bar centring — the actual cause

Tab items were bunched to the left because `AnimatedPressable` applied its
`style` prop to an inner `Animated.View`, so `flex: 1` never reached the
`Pressable` that needed it. Fixed by adding a separate `containerStyle` prop
that lands on the `Pressable` itself.

Worth recording because several plausible-sounding guesses (padding, spacing,
`justifyContent`) were all wrong, and the real cause was only found from a
screenshot of the rendered result.

## Not verified

- Android: `NOT DONE`
- Any iOS version other than 26.6: `NOT DONE`
- On-device performance: `NOT MEASURED`

## Related
- [[maps/architecture.md]]
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]
