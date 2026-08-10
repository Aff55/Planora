import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { ScreenName, secondaryScreens, colors } from "../theme";
import { SectionTitle, Group, Row, FadeIn } from "../ui";
import { styles } from "../styles";

export function MoreScreen({
  palette,
  setScreen
}: {
  palette: ReturnType<typeof colors>;
  setScreen: (screen: ScreenName) => void;
}) {
  return (
    <View style={styles.stack}>
      <View>
        <SectionTitle palette={palette} title="Everything else" />
        <Group palette={palette}>
          {secondaryScreens.map((item, index) => (
            <FadeIn key={item.name} index={index}>
              <Row palette={palette} onPress={() => setScreen(item.name)} accessibilityLabel={item.name}>
                <Ionicons name={item.icon} size={20} color={palette.orange} />
                <View style={styles.flex}>
                  <Text style={[styles.itemTitle, { color: palette.text }]}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: palette.muted }]}>{item.body}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={palette.faint} />
              </Row>
            </FadeIn>
          ))}
        </Group>
      </View>
    </View>
  );
}
