import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Alert,
  Text,
  View
} from "react-native";
import { apiDownloadText, normalizeApiUrl } from "../api";
import type { CurrentUser, SettingsShape } from "../types";
import { apiUrlKey, defaultSettings, colors } from "../theme";
import { Card, SectionTitle, Input, Button, GhostButton, OptionChips, ToggleRow } from "../ui";
import { styles } from "../styles";

export function SettingsScreen({
  palette,
  user,
  token,
  apiUrl,
  setApiUrl,
  refreshMe,
  updateSettings,
  api,
  guarded,
  logout,
  logoutEverywhere
}: {
  palette: ReturnType<typeof colors>;
  user: CurrentUser;
  token: string;
  apiUrl: string;
  setApiUrl: (value: string) => void;
  refreshMe: () => Promise<void>;
  updateSettings: (settings: SettingsShape) => Promise<void>;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  guarded: (run: () => Promise<void>, success?: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [settings, setSettings] = useState<SettingsShape>({ ...defaultSettings, ...(user.settings ?? {}) });
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    setName(user.name);
    setTimezone(user.timezone);
    setSettings({ ...defaultSettings, ...(user.settings ?? {}) });
  }, [user]);

  async function saveProfile() {
    await guarded(() => api("/auth/profile", { method: "PUT", body: JSON.stringify({ name, timezone }) }).then(refreshMe), "Profile saved.");
  }

  async function saveSettings(next = settings) {
    await guarded(() => updateSettings(next), "Preferences saved.");
  }

  async function saveApiUrl() {
    const normalized = normalizeApiUrl(apiUrl);
    setApiUrl(normalized);
    await AsyncStorage.setItem(apiUrlKey, normalized);
    Alert.alert("API URL saved", "Restart the app or sign in again if you changed servers.");
  }

  async function enableNotifications() {
    const next = { ...settings, notificationPush: true };
    setSettings(next);
    await saveSettings(next);
    Alert.alert("Notifications enabled", "Planora will send a daily brief and sync due task/event reminders.");
  }

  async function disableNotifications() {
    const next = { ...settings, notificationPush: false };
    setSettings(next);
    await saveSettings(next);
    Alert.alert("Notifications disabled", "Planora reminders have been cleared from this device.");
  }

  async function exportData() {
    await guarded(async () => {
      const exported = await apiDownloadText(apiUrl, "/auth/export", token);
      const safeName = exported.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uri = `${FileSystem.cacheDirectory}${safeName}`;
      try {
        await FileSystem.writeAsStringAsync(uri, exported.text, { encoding: FileSystem.EncodingType.UTF8 });
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("File sharing is not available on this device.");
        }
        await Sharing.shareAsync(uri, { dialogTitle: "Export Planora data" });
      } finally {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
      }
    }, "Export ready.");
  }

  function clearAiData() {
    Alert.alert(
      "Clear AI memory?",
      "This removes saved chats, semantic memory, and learning events. Tasks and life logs stay.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => void guarded(() => api("/auth/ai-data", { method: "DELETE" }), "AI memory cleared.")
        }
      ]
    );
  }

  return (
    <View style={styles.stack}>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Account basics" />
        <Input palette={palette} label="Name" value={name} onChangeText={setName} />
        <Input palette={palette} label="Timezone" value={timezone} onChangeText={setTimezone} />
        <Button palette={palette} icon="save-outline" label="Save profile" onPress={() => void saveProfile()} />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Preferences" />
        <OptionChips palette={palette} label="Theme" value={settings.theme} options={["SYSTEM", "LIGHT", "DARK"]} onChange={(theme) => setSettings({ ...settings, theme: theme as SettingsShape["theme"] })} />
        <ToggleRow palette={palette} label="Push notifications" value={settings.notificationPush} onValueChange={(notificationPush) => setSettings({ ...settings, notificationPush })} />
        <ToggleRow palette={palette} label="Privacy mode" value={settings.privacyMode} onValueChange={(privacyMode) => setSettings({ ...settings, privacyMode })} />
        <ToggleRow palette={palette} label="AI personalization" value={settings.aiPersonalization} onValueChange={(aiPersonalization) => setSettings({ ...settings, aiPersonalization })} />
        <OptionChips palette={palette} label="Export format" value={settings.exportFormat} options={["JSON", "CSV"]} onChange={(exportFormat) => setSettings({ ...settings, exportFormat: exportFormat as SettingsShape["exportFormat"] })} />
        <Button palette={palette} icon="save-outline" label="Save preferences" onPress={() => void saveSettings()} />
        <Button palette={palette} icon="notifications-outline" label="Enable daily brief + reminders" onPress={() => void enableNotifications()} />
        <GhostButton palette={palette} label="Disable Planora notifications" onPress={() => void disableNotifications()} />
      </Card>
      {__DEV__ && (
        <Card palette={palette}>
          <SectionTitle palette={palette} title="Development server" />
          <Input palette={palette} label="API URL" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
          <Button palette={palette} icon="server-outline" label="Save API URL" onPress={() => void saveApiUrl()} />
        </Card>
      )}
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Your data" />
        <Button palette={palette} icon="download-outline" label="Export Planora data" onPress={() => void exportData()} />
        <GhostButton palette={palette} label="Clear AI memory" onPress={clearAiData} />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Session" />
        <Button palette={palette} icon="log-out-outline" label="Logout" onPress={() => void logout()} />
        <GhostButton
          palette={palette}
          label="Logout on all devices"
          onPress={() => Alert.alert("Logout everywhere?", "Every active Planora session will be signed out.", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout everywhere", style: "destructive", onPress: () => void logoutEverywhere() }
          ])}
        />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Delete account" />
        <Text style={[styles.body, { color: palette.muted }]}>This permanently removes your user-owned data. Confirm your email and password.</Text>
        <Input palette={palette} label="Email confirmation" value={deleteEmail} onChangeText={setDeleteEmail} autoCapitalize="none" />
        <Input palette={palette} label="Current password" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
        <Button palette={palette} icon="trash-outline" label="Delete account" danger disabled={deleteEmail !== user.email || !deletePassword} onPress={() => Alert.alert("Delete account?", "This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void guarded(() => api("/auth/account", { method: "DELETE", body: JSON.stringify({ emailConfirmation: deleteEmail, currentPassword: deletePassword }) }).then(logout), "Account deleted.") }])} />
      </Card>
    </View>
  );
}
