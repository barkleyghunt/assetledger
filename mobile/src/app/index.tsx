import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { LidarScanner } from "../../modules/lidar-scanner";
import { Button, Card, styles } from "../components/ui";
import { listElements, pendingCount } from "../lib/db";
import { syncAll } from "../lib/sync";

export default function ElementsScreen() {
  const [elements, setElements] = useState(() => listElements());
  const [pending, setPending] = useState(() => pendingCount());
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const reload = useCallback(() => {
    setElements(listElements());
    setPending(pendingCount());
  }, []);
  useFocusEffect(reload);
  const lidar = LidarScanner.isLidarAvailable();

  const sync = async () => {
    setSyncStatus("Starting sync…");
    try {
      const r = await syncAll(setSyncStatus);
      const sent = `${r.scans} scan${r.scans === 1 ? "" : "s"} and ${r.defects} defect${r.defects === 1 ? "" : "s"} sent.`;
      Alert.alert(r.errors.length ? "Sync finished with problems" : "Sync complete", r.errors.length ? `${sent}\n\n${r.errors.join("\n")}` : sent);
    } catch (e) {
      Alert.alert("Sync", e instanceof Error ? e.message : String(e));
    } finally {
      setSyncStatus(null);
      reload();
    }
  };

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={elements}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.muted}>
              {lidar
                ? "LiDAR available on this phone."
                : "No LiDAR on this phone. Use photo sets; dimensions need a scale check."}
            </Text>
            <View style={{ height: 12 }} />
            <Button title="Add element" onPress={() => router.push("/element/new")} />
            <Button
              title={syncStatus ?? (pending ? `Sync to web app (${pending} waiting)` : "Sync to web app")}
              kind="secondary"
              onPress={sync}
              disabled={syncStatus != null}
            />
            <Button title="Settings" kind="secondary" onPress={() => router.push("/settings")} />
          </View>
        }
        ListEmptyComponent={<Text style={styles.muted}>No elements yet. Add one using the same ID as the web catalogue (e.g. GY-192).</Text>}
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: "/element/[id]", params: { id: item.id } })}>
            <Text style={styles.title}>{item.id}</Text>
            <Text style={styles.body}>{item.name}</Text>
            {item.location ? <Text style={styles.muted}>{item.location}</Text> : null}
            <Text style={styles.note}>
              {item.scans} scan{item.scans === 1 ? "" : "s"} · {item.defects} defect{item.defects === 1 ? "" : "s"}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
