import { Text, View, type StyleProp, type TextStyle } from "react-native";

/**
 * Icons drawn with system glyphs instead of an icon font.
 *
 * `@expo/vector-icons` needs its glyph font loaded at runtime, and on the Expo
 * Go build this project has to support that never completed - every icon showed
 * as an empty box. The font file itself was reachable (Metro served Ionicons.ttf
 * at 200, 389 KB) and the loading call was correct, so the failure sits inside
 * that client rather than in this code. These glyphs are part of the operating
 * system: nothing to fetch, nothing to resolve, nothing that can fail.
 *
 * Monochrome symbols are strongly preferred over emoji. They inherit `color`,
 * so an icon can be tinted by state the way the rest of the design system
 * expects, and they read as deliberate rather than decorative. Emoji are used
 * only where no monochrome character carries the meaning, and are marked below.
 *
 * The props mirror the Ionicons component, so call sites are unchanged and
 * swapping back later is a one-line import edit per file.
 */
const GLYPHS: Record<string, string> = {
  // The five tab-bar icons carry the most weight, so they are the roundest and
  // most distinct shapes in the set rather than the most literal ones.
  "home-outline": "◈",
  "checkbox-outline": "✓",
  "walk-outline": "❖",
  "chatbubble-ellipses-outline": "✦",
  "grid-outline": "⋯",

  // navigation and structure
  "search-outline": "⌕",
  "chevron-forward": "›",
  "chevron-forward-outline": "›",
  "chevron-back-outline": "‹",
  "close-outline": "✕",
  "checkmark": "✓",
  "checkmark-outline": "✓",
  "checkmark-circle-outline": "✓",
  "checkmark-done-outline": "✓",

  // planning
  "list-outline": "☰",
  "calendar-outline": "▦",
  "time-outline": "◷",
  "hourglass-outline": "◴",
  "flag-outline": "⚑",
  "add-outline": "＋",
  "add-circle-outline": "＋",
  "create-outline": "✎",
  "trash-outline": "⌫",
  "filter-outline": "⇅",
  "save-outline": "⤓",
  "refresh-outline": "↻",
  "send-outline": "➤",
  "download-outline": "⤓",

  // life and wellbeing - the warmer half of the set, kept soft on purpose
  "barbell-outline": "⚏",
  "restaurant-outline": "❍",
  "people-outline": "◍",
  "person-outline": "○",
  "person-circle-outline": "◎",
  "heart-outline": "♡",
  "happy-outline": "☺",
  "moon-outline": "☽",
  "sunny-outline": "☀",
  "water-outline": "◇",
  "flame-outline": "▲",
  "book-outline": "▤",

  // ai and insight
  "analytics-outline": "↗",
  "bar-chart-outline": "▥",
  "bulb-outline": "✻",
  "sparkles-outline": "✦",
  "hardware-chip-outline": "▩",
  "document-text-outline": "❐",
  "server-outline": "☰",

  // system
  "settings-outline": "⚙",
  "notifications-outline": "⌁",
  "log-in-outline": "→",
  "log-out-outline": "←",
  "information-circle-outline": "ⓘ",
  "alert-circle-outline": "⚠"
};

/** Anything unmapped shows a neutral dot rather than tofu or a crash. */
const FALLBACK = "•";

/**
 * Variation Selector-15, which asks for the *text* rendering of a character.
 *
 * Several of these symbols - the gear and the warning triangle most visibly -
 * have an emoji presentation that iOS picks by default, so they arrived
 * full-colour while everything around them was tinted. Appending VS15 pins them
 * to the monochrome form, which then inherits `color` like the rest. It is
 * ignored by characters that have no emoji variant, so it is safe to append to
 * every glyph rather than maintaining a list of exceptions.
 */
const TEXT_PRESENTATION = "︎";

export function Icon({
  name,
  size = 20,
  color,
  style
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    // A fixed square box does the centring. Relying on the glyph's own line
    // height does not work: every symbol has a different baseline and ascent, so
    // icons sat at slightly different heights and none of them lined up with
    // the text beside them.
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text
        allowFontScaling={false}
        style={[
          {
            fontSize: size * 0.86,
            lineHeight: size * 0.86,
            color,
            textAlign: "center",
            // Android reserves extra vertical space inside Text for font
            // metrics, which would push the glyph off-centre in the box above.
            includeFontPadding: false
          },
          style
        ]}
      >
        {(GLYPHS[name] ?? FALLBACK) + TEXT_PRESENTATION}
      </Text>
    </View>
  );
}

/** Names are plain strings now; kept so `theme.ts` and callers still type-check. */
export type IconName = string;
