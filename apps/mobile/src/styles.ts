import { StyleSheet } from "react-native";

/**
 * Mobile type and shape scale, mirroring the web design system.
 *
 * Weights are limited to three steps (400 body, 600 emphasis, 700 headings)
 * instead of the previous near-universal "900", which flattened every level of
 * hierarchy. Corner radii collapse to three values: 8 for chips and inner
 * elements, 12 for controls, 16 for cards and sheets.
 */
const radius = { sm: 8, control: 12, card: 16 };

export const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  keyboard: {
    flex: 1
  },
  appHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    minWidth: 0
  },
  headerMark: {
    width: 30,
    height: 30,
    borderRadius: 7
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34
  },
  content: {
    padding: 16,
    paddingBottom: 120
  },
  stack: {
    gap: 16
  },
  authContent: {
    padding: 22,
    paddingTop: 48,
    gap: 18
  },
  authHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  themePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  themeText: {
    fontWeight: "600",
    fontSize: 14
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 36
  },
  heroBody: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22
  },

  /* Grouped list: one rounded container, hairline-divided rows. */
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 16,
    gap: 14
  },
  group: {
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden"
  },
  groupRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  separator: {
    height: StyleSheet.hairlineWidth
  },

  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: 8
  },
  sectionText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "600"
  },
  monthNavigator: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  monthLabel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  inputGroup: {
    gap: 6
  },
  label: {
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: "400"
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dateTimeValue: {
    minHeight: 46,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dateTimeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400"
  },
  dateTimeIcon: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  dateTimeClock: {
    fontSize: 13,
    fontWeight: "500"
  },
  dateTimeClear: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center"
  },
  hint: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18
  },
  button: {
    minHeight: 46,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600"
  },
  ghostButton: {
    minHeight: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  ghostText: {
    fontSize: 15,
    fontWeight: "600"
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    flexGrow: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
    gap: 6
  },
  metricHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "400",
    flexShrink: 1
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickTile: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14,
    gap: 8
  },
  quickText: {
    fontSize: 15,
    fontWeight: "600"
  },
  listItem: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
    gap: 8,
    marginBottom: 8
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  itemMeta: {
    fontSize: 13,
    fontWeight: "400"
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center"
  },
  rowBetween: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  flex: {
    flex: 1
  },
  doneButton: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.55
  },
  smallButton: {
    minHeight: 34,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: "600"
  },
  chips: {
    gap: 8,
    paddingRight: 18
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500"
  },
  twoCol: {
    flexDirection: "row",
    gap: 10
  },
  chatTurn: {
    gap: 8
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4
  },
  bubbleRight: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21
  },
  bubbleMeta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase"
  },
  empty: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
    gap: 6
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600"
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  centeredInner: {
    alignItems: "center",
    gap: 10
  },
  bootLogo: {
    width: 64,
    height: 64,
    borderRadius: 15
  },
  skeleton: {
    borderRadius: radius.sm
  },
  tabShell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Breathing room above the row, which is what stops five tabs reading as a
    // crowded strip pinned to the bottom edge.
    paddingTop: 10,
    paddingBottom: 4
  },
  /**
   * Covers the home-indicator strip beneath the tab bar. Sized generously so it
   * spans the inset on every device; anything it covers beyond the bar is the
   * same colour anyway.
   */
  bottomFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 48
  },
  tabs: {
    paddingHorizontal: 6,
    gap: 4,
    flexDirection: "row"
  },
  /** The flex cell itself. Must sit on the Pressable, not on its inner view. */
  tabSlot: {
    flex: 1,
    minWidth: 0
  },
  tab: {
    minWidth: 0,
    // Apple's minimum comfortable target is 44pt; 60 gives the icon and its
    // label room to sit apart without the whole bar feeling heavy. The previous
    // 52 with an 11pt label was genuinely hard to hit.
    minHeight: 56,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    // The icon and its label are a single unit; the space that makes the row
    // feel calm belongs around them, not between them.
    gap: 3,
    paddingHorizontal: 2
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.1,
    // Without an explicit centre and a full-width box the label aligns to the
    // start of whatever width it happens to take, so "Companion" and "Life" sat
    // off-centre from each other and from their icons.
    textAlign: "center",
    alignSelf: "stretch",
    includeFontPadding: false
  },
  notice: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500"
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start"
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500"
  },
  toggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    padding: 3
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "white"
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500"
  }
});
