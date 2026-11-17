import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../components/ui";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Asset Ledger · Field" }} />
        <Stack.Screen name="element/new" options={{ title: "Add element", presentation: "modal" }} />
        <Stack.Screen name="element/[id]" options={{ title: "Element" }} />
        <Stack.Screen name="scan/[id]" options={{ title: "Scan" }} />
        <Stack.Screen name="capture/photo-set" options={{ title: "Photo set" }} />
        <Stack.Screen name="defect/new" options={{ title: "Record defect", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}
