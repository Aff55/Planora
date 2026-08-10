import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { apiRequest } from "../api";
import type { CurrentUser } from "../types";
import { colors } from "../theme";
import { Card, Input, Button, GhostButton, FadeIn } from "../ui";
import { styles } from "../styles";

export function AuthScreen({
  palette,
  apiUrl,
  setApiUrl,
  saveSession,
  toggleTheme,
  dark
}: {
  palette: ReturnType<typeof colors>;
  apiUrl: string;
  setApiUrl: (value: string) => void;
  saveSession: (token: string, user: CurrentUser) => Promise<void>;
  toggleTheme: () => void;
  dark: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const payload =
        mode === "login"
          ? { email, password, rememberMe: true }
          : {
              name,
              email,
              password,
              rememberMe: true,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
            };
      const data = await apiRequest<{ token: string; user: CurrentUser }>(
        apiUrl,
        mode === "login" ? "/auth/login" : "/auth/register",
        { method: "POST", body: JSON.stringify(payload) }
      );
      await saveSession(data.token, data.user);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
      <View style={styles.authHeader}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} accessibilityLabel="Planora" />
        <Pressable
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={[styles.themePill, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <Ionicons name={dark ? "moon-outline" : "sunny-outline"} size={17} color={palette.muted} />
          <Text style={[styles.themeText, { color: palette.text }]}>{dark ? "Dark" : "Light"}</Text>
        </Pressable>
      </View>

      <FadeIn>
        <Text style={[styles.heroTitle, { color: palette.text }]}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </Text>
        <Text style={[styles.heroBody, { color: palette.muted, marginTop: 6 }]}>
          Your dashboard, calendar, life logs, wellbeing, and local AI companion, scoped to your account.
        </Text>
      </FadeIn>

      <Card palette={palette}>
        {mode === "register" && (
          <Input palette={palette} label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        )}
        <Input
          palette={palette}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          palette={palette}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          hint={mode === "register" ? "At least 8 characters." : undefined}
        />
        {__DEV__ && (
          <Input
            palette={palette}
            label="Development API"
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            hint="Use localhost on iOS, 10.0.2.2 on Android, or your computer LAN IP on a physical phone."
          />
        )}
        {error && <Text style={[styles.errorText, { color: palette.red }]}>{error}</Text>}
        <Button
          palette={palette}
          icon="log-in-outline"
          label={loading ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
          onPress={() => void submit()}
          disabled={loading}
        />
        <GhostButton
          palette={palette}
          label={mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
          onPress={() => setMode(mode === "login" ? "register" : "login")}
        />
      </Card>
    </ScrollView>
  );
}
