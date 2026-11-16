import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { Button, Field, styles } from "../components/ui";
import { loadSettings, saveSettings, testConnection } from "../lib/sync";

export default function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) {
        setServerUrl(s.serverUrl);
        setToken(s.token);
      }
    });
  }, []);

  const save = async () => {
    if (!/^https:\/\//.test(serverUrl.trim())) return Alert.alert("Settings", "Server address must start with https://");
    if (token.trim().length < 32) return Alert.alert("Settings", "Paste the full device token.");
    setBusy(true);
    try {
      const settings = { serverUrl: serverUrl.trim(), token: token.trim() };
      const who = await testConnection({ ...settings, serverUrl: settings.serverUrl.replace(/\/+$/, "") });
      await saveSettings(settings);
      Alert.alert("Connected", `Signed in as ${who.role} (${who.device}).`);
      router.back();
    } catch (e) {
      Alert.alert("Could not connect", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Web app address" value={serverUrl} onChangeText={setServerUrl} placeholder="https://assetledger.example.com" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      <Field label="Device token" value={token} onChangeText={setToken} placeholder="From the project owner" autoCapitalize="none" autoCorrect={false} secureTextEntry />
      <Button title={busy ? "Checking…" : "Save and test"} onPress={save} disabled={busy} />
      <Text style={styles.note}>The owner creates one token per phone. It is kept in the phone&apos;s secure storage and can be revoked on the server.</Text>
    </ScrollView>
  );
}
