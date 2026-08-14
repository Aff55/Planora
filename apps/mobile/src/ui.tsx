import { Icon as Ionicons } from "./icon";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { formatDate, toDateTimeLocal } from "./api";
import type { ActivityEntry, Recommendation, Task } from "./types";
import type { IconName, ScreenName } from "./theme";
import { tabs, secondaryScreens, colors } from "./theme";
import { styles } from "./styles";

type Palette = ReturnType<typeof colors>;

/**
 * Tracks the OS "reduce motion" setting so every animation in this kit can be
 * skipped rather than merely shortened.
 */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduce(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

/**
 * Shared press feedback for every tappable control in the kit: a quick,
 * springy scale-down on press and a bouncier scale-back on release, all on
 * the native driver so it stays smooth even while JS is busy. This is the
 * mobile equivalent of the web kit's `active:scale-[0.97]` + spring easing.
 */
function AnimatedPressable({
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  style,
  // `style` lands on the inner animated view, so layout that has to be seen by
  // the *parent* - `flex: 1` in a row, most importantly - has to go here or it
  // is applied to a child and silently does nothing. That is what left the tab
  // bar bunched into the left of the screen: every tab sized to its own text
  // instead of taking an equal share of the row.
  containerStyle,
  pressedScale = 0.96,
  children
}: {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "tab";
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  function pressIn() {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: pressedScale, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  function pressOut() {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }).start();
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : pressIn}
      onPressOut={disabled ? undefined : pressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? "button"}
      style={containerStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Fades and lifts content into place. Used for screen changes and for list rows,
 * where `index` staggers the entry. The stagger is capped so long lists never
 * feel like they are loading slowly.
 */
export function FadeIn({
  index = 0,
  children,
  style
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index, 5) * 24,
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [index, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Counts a number up on first paint. Later value changes snap immediately. */
export function CountUpText({
  value,
  suffix = "",
  style
}: {
  value: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [display, setDisplay] = useState(value);
  const animated = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (hasAnimated.current || reduceMotion || !Number.isFinite(value) || value === 0) {
      setDisplay(value);
      return;
    }
    hasAnimated.current = true;
    const listener = animated.addListener(({ value: current }) => setDisplay(Math.round(current)));
    const animation = Animated.timing(animated, { toValue: value, duration: 650, useNativeDriver: false });
    animation.start();
    return () => {
      animation.stop();
      animated.removeListener(listener);
    };
  }, [animated, reduceMotion, value]);

  return <Text style={style}>{`${display.toLocaleString()}${suffix}`}</Text>;
}

/**
 * Keeps content clear of the on-screen keyboard.
 *
 * React Native ships `KeyboardAvoidingView` for this, but it is a class
 * component that keeps its handlers as class fields, and it does not survive
 * the class lowering this app needs for older Hermes builds: the instance loses
 * `_updateBottomIfNecessary`, and every keyboard event throws. The behaviour is
 * a few lines as a function component, and a function component has no class
 * semantics to lower, so this sidesteps the problem instead of shimming it.
 *
 * Matches the previous `behavior="padding"` on iOS. Android already pans the
 * window itself, so adding padding there would double-count the keyboard.
 */
function KeyboardAvoider({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    // `WillChangeFrame` tracks the interactive dismiss gesture too, not just
    // the show/hide pair, so the content follows the keyboard rather than
    // snapping once it has finished moving.
    const onChange = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      const screenHeight = Dimensions.get("window").height;
      const top = event.endCoordinates?.screenY ?? screenHeight;
      setKeyboardHeight(Math.max(0, screenHeight - top));
    });
    const onHide = Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
    return () => {
      onChange.remove();
      onHide.remove();
    };
  }, []);

  return <View style={[style, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>{children}</View>;
}

export function AppFrame({ palette, dark, children }: { palette: Palette; dark: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar style={dark ? "light" : "dark"} />
      {/*
        The tab bar sits inside the safe area, so it stops short of the physical
        bottom edge and the home-indicator strip below it showed the page
        background - a dark band under the bar. This paints that strip in the
        bar's own colour, so the bar reads as reaching the bottom of the screen.
        Rendered before the content so it stays behind everything.
      */}
      <View style={[styles.bottomFill, { backgroundColor: palette.card }]} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoider style={styles.keyboard}>{children}</KeyboardAvoider>
      </SafeAreaView>
    </View>
  );
}

export function TabBar({
  palette,
  active,
  setScreen
}: {
  palette: Palette;
  active: ScreenName;
  setScreen: (screen: ScreenName) => void;
}) {
  return (
    <View style={[styles.tabShell, { borderTopColor: palette.border, backgroundColor: palette.card }]}>
      {/*
        No SafeAreaView here. AppFrame already applies the bottom inset, and
        nesting a second one counted the home-indicator padding twice, which is
        what pushed the bar up and opened the gap beneath it.
      */}
      <View>
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const selected =
              active === tab.name || (tab.name === "More" && secondaryScreens.some((item) => item.name === active));
            return (
              <AnimatedPressable
                key={tab.name}
                onPress={() => setScreen(tab.name)}
                pressedScale={0.92}
                accessibilityRole="tab"
                accessibilityLabel={tab.name}
                containerStyle={styles.tabSlot}
                style={styles.tab}
              >
                <Ionicons name={tab.icon} size={24} color={selected ? palette.orange : palette.muted} />
                <Text
                  numberOfLines={1}
                  style={[styles.tabText, { color: selected ? palette.orange : palette.muted }]}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function Card({ palette, children }: { palette: Palette; children: React.ReactNode }) {
  return <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>{children}</View>;
}

/** Rounded container for hairline-separated rows, the iOS inset grouped list. */
export function Group({ palette, children }: { palette: Palette; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View style={[styles.group, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 && <View style={[styles.separator, { backgroundColor: palette.separator }]} />}
          {child}
        </View>
      ))}
    </View>
  );
}

export function Row({
  palette,
  children,
  onPress,
  accessibilityLabel
}: {
  palette: Palette;
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        pressedScale={0.99}
        style={styles.groupRow}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[styles.groupRow, { backgroundColor: palette.card }]}>{children}</View>;
}

export function Skeleton({ palette, width, height = 12 }: { palette: Palette; width: number | string; height?: number }) {
  return (
    <View
      style={[
        styles.skeleton,
        { width: width as number, height, backgroundColor: palette.dark ? "rgba(255,255,255,0.08)" : "rgba(23,32,51,0.07)" }
      ]}
    />
  );
}

export function SectionTitle({
  palette,
  title,
  action,
  onAction
}: {
  palette: Palette;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: palette.muted }]}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={[styles.sectionAction, { color: palette.orange }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Input({
  palette,
  label,
  hint,
  multiline,
  ...props
}: {
  palette: Palette;
  label: string;
  hint?: string;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={palette.faint}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }
        ]}
      />
      {!!hint && <Text style={[styles.hint, { color: palette.muted }]}>{hint}</Text>}
    </View>
  );
}

export function DateTimeField({
  palette,
  label,
  value,
  onChange,
  allowClear = false
}: {
  palette: Palette;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowClear?: boolean;
}) {
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const selected = value ? new Date(value) : new Date();
  const validSelected = Number.isNaN(selected.getTime()) ? new Date() : selected;

  function update(event: DateTimePickerEvent, next?: Date) {
    setPickerMode(null);
    if (event.type !== "set" || !next) return;
    onChange(toDateTimeLocal(next));
  }

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View style={styles.dateTimeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label.toLowerCase()} date`}
          onPress={() => setPickerMode("date")}
          style={[styles.dateTimeValue, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <Ionicons name="calendar-outline" size={17} color={palette.orange} />
          <Text numberOfLines={1} style={[styles.dateTimeText, { color: value ? palette.text : palette.muted }]}>
            {value ? validSelected.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "No date"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label.toLowerCase()} time`}
          onPress={() => setPickerMode("time")}
          style={[styles.dateTimeIcon, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <Ionicons name="time-outline" size={17} color={palette.orange} />
          <Text style={[styles.dateTimeClock, { color: palette.text }]}>
            {value ? validSelected.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Time"}
          </Text>
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => onChange("")}
            style={[styles.dateTimeClear, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="close-outline" size={19} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>
      {pickerMode && (
        <DateTimePicker
          value={validSelected}
          mode={pickerMode}
          display={Platform.OS === "ios" ? "compact" : "default"}
          onChange={update}
        />
      )}
    </View>
  );
}

export function Button({
  palette,
  label,
  icon,
  onPress,
  disabled,
  danger
}: {
  palette: Palette;
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.button, { backgroundColor: danger ? palette.red : palette.orange, opacity: disabled ? 0.45 : 1 }]}
    >
      {icon && <Ionicons name={icon} size={17} color="white" />}
      <Text style={styles.buttonText}>{label}</Text>
    </AnimatedPressable>
  );
}

export function GhostButton({ palette, label, onPress }: { palette: Palette; label: string; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.ghostButton, { borderColor: palette.border, backgroundColor: palette.card }]}
    >
      <Text style={[styles.ghostText, { color: palette.text }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function SmallButton({
  palette,
  label,
  icon,
  danger,
  onPress
}: {
  palette: Palette;
  label: string;
  icon: IconName;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.smallButton, { backgroundColor: danger ? "rgba(239,68,68,0.12)" : palette.amberSoft }]}
    >
      <Ionicons name={icon} size={14} color={danger ? palette.red : palette.orange} />
      <Text style={[styles.smallButtonText, { color: danger ? palette.red : palette.orange }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function IconButton({
  palette,
  icon,
  label,
  onPress
}: {
  palette: Palette;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      accessibilityLabel={label}
      onPress={onPress}
      pressedScale={0.9}
      style={[styles.iconButton, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      <Ionicons name={icon} size={18} color={palette.muted} />
    </AnimatedPressable>
  );
}

export function OptionChips<T extends string>({
  palette,
  label,
  value,
  options,
  labels,
  onChange
}: {
  palette: Palette;
  label: string;
  value: T;
  options: T[];
  labels?: Record<string, string>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option || "all"}
              accessibilityRole="button"
              onPress={() => onChange(option)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? palette.orange : palette.border,
                  backgroundColor: selected ? palette.orange : palette.card
                }
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? "white" : palette.text }]}>
                {labels?.[option] ?? option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ToggleRow({
  palette,
  label,
  value,
  disabled,
  onValueChange
}: {
  palette: Palette;
  label: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      onPress={() => onValueChange(!value)}
      style={[
        styles.toggleRow,
        {
          backgroundColor: palette.card,
          borderWidth: 1,
          borderRadius: 16,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1
        }
      ]}
    >
      <Text style={[styles.body, styles.flex, { color: palette.text }]}>{label}</Text>
      <View style={[styles.toggleTrack, { backgroundColor: value ? palette.orange : palette.border }]}>
        <View style={[styles.toggleThumb, { transform: [{ translateX: value ? 18 : 0 }] }]} />
      </View>
    </Pressable>
  );
}

export function Metric({
  palette,
  icon,
  label,
  value,
  tone,
  animateTo,
  suffix
}: {
  palette: Palette;
  icon: IconName;
  label: string;
  value: string;
  tone: "orange" | "sky" | "green";
  /** When set, the figure counts up on first paint instead of rendering `value`. */
  animateTo?: number;
  suffix?: string;
}) {
  const color = tone === "orange" ? palette.orange : tone === "sky" ? palette.sky : palette.green;
  return (
    <View style={[styles.metric, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.metricHead}>
        <Ionicons name={icon} size={15} color={color} />
        <Text numberOfLines={1} style={[styles.metricLabel, { color: palette.muted }]}>
          {label}
        </Text>
      </View>
      {typeof animateTo === "number" ? (
        <CountUpText value={animateTo} suffix={suffix} style={[styles.metricValue, { color: palette.text }]} />
      ) : (
        <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
      )}
    </View>
  );
}

export function TaskRow({
  palette,
  task,
  onDone,
  onEdit,
  onDelete
}: {
  palette: Palette;
  task: Task;
  onDone: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const done = task.status === "COMPLETED";
  return (
    <View style={[styles.listItem, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.rowBetween}>
        <AnimatedPressable
          onPress={onDone}
          pressedScale={0.86}
          accessibilityLabel={done ? `Reopen ${task.title}` : `Mark ${task.title} complete`}
          style={[
            styles.doneButton,
            { borderColor: done ? palette.green : palette.border, backgroundColor: done ? palette.green : "transparent" }
          ]}
        >
          <Ionicons name="checkmark" size={17} color={done ? "white" : "transparent"} />
        </AnimatedPressable>
        <View style={styles.flex}>
          <Text style={[styles.itemTitle, done && styles.completedText, { color: palette.text }]}>{task.title}</Text>
          <Text style={[styles.itemMeta, { color: palette.muted }]}>
            {task.dueDate ? formatDate(task.dueDate) : "No due date"} · {task.priority} · {task.category}
          </Text>
          {!!task.description && <Text style={[styles.body, { color: palette.muted }]}>{task.description}</Text>}
        </View>
      </View>
      {(onEdit || onDelete) && (
        <View style={styles.row}>
          {onEdit && <SmallButton palette={palette} label="Edit" icon="create-outline" onPress={onEdit} />}
          {onDelete && <SmallButton palette={palette} label="Delete" icon="trash-outline" danger onPress={onDelete} />}
        </View>
      )}
    </View>
  );
}

export function ActivityRow({
  palette,
  item,
  onDelete
}: {
  palette: Palette;
  item: ActivityEntry;
  onDelete?: () => void;
}) {
  return (
    <View style={[styles.listItem, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.itemTitle, { color: palette.text }]}>{item.title}</Text>
      <Text style={[styles.itemMeta, { color: palette.muted }]}>
        {item.category} · {item.minutes}m · {formatDate(item.occurredAt)}
      </Text>
      {!!item.notes && <Text style={[styles.body, { color: palette.muted }]}>{item.notes}</Text>}
      {onDelete && <SmallButton palette={palette} label="Delete" icon="trash-outline" danger onPress={onDelete} />}
    </View>
  );
}

export function RecommendationCard({
  palette,
  rec,
  onAccept,
  onDismiss
}: {
  palette: Palette;
  rec: Recommendation;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={[styles.listItem, { borderColor: palette.border, backgroundColor: palette.card }]}>
      <Text style={[styles.itemTitle, { color: palette.text }]}>{rec.title}</Text>
      <Text style={[styles.body, { color: palette.muted }]}>{rec.body}</Text>
      <View style={styles.row}>
        <SmallButton palette={palette} label="Acted" icon="checkmark-outline" onPress={onAccept} />
        <SmallButton palette={palette} label="Dismiss" icon="close-outline" onPress={onDismiss} />
      </View>
    </View>
  );
}

export function Bubble({
  palette,
  role,
  text,
  meta
}: {
  palette: Palette;
  role: "user" | "assistant";
  text: string;
  meta?: string;
}) {
  const mine = role === "user";
  return (
    <View
      style={[
        styles.bubble,
        mine ? styles.bubbleRight : styles.bubbleLeft,
        { backgroundColor: mine ? palette.orange : palette.soft }
      ]}
    >
      <Text style={[styles.bubbleText, { color: mine ? "white" : palette.text }]}>{text}</Text>
      {!!meta && <Text style={[styles.bubbleMeta, { color: mine ? "rgba(255,255,255,0.75)" : palette.faint }]}>{meta}</Text>}
    </View>
  );
}

export function Empty({ palette, icon, title, body }: { palette: Palette; icon: IconName; title: string; body: string }) {
  return (
    <View style={[styles.empty, { backgroundColor: palette.card, borderRadius: 16, borderWidth: 1, borderColor: palette.border }]}>
      <Ionicons name={icon} size={24} color={palette.muted} />
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.hint, { color: palette.muted, textAlign: "center" }]}>{body}</Text>
    </View>
  );
}

export function Centered({ palette, icon, title, body }: { palette: Palette; icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.centered}>
      <View style={styles.centeredInner}>
        <Ionicons name={icon} size={32} color={palette.orange} />
        <Text style={[styles.heroTitle, { color: palette.text, textAlign: "center" }]}>{title}</Text>
        <Text style={[styles.heroBody, { color: palette.muted, textAlign: "center" }]}>{body}</Text>
      </View>
    </View>
  );
}

export function Pill({ palette, label }: { palette: Palette; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.pillText, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

export function Notice({
  palette,
  kind,
  message,
  onClose
}: {
  palette: Palette;
  kind: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <FadeIn>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss: ${message}`}
        style={[
          styles.notice,
          {
            backgroundColor: kind === "error" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
            borderColor: kind === "error" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"
          }
        ]}
      >
        <Ionicons
          name={kind === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
          size={17}
          color={kind === "error" ? palette.red : palette.green}
        />
        <Text style={[styles.noticeText, { color: palette.text }]}>{message}</Text>
        <Ionicons name="close-outline" size={16} color={palette.muted} />
      </Pressable>
    </FadeIn>
  );
}
