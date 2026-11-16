import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { LidarScanner } from "../../modules/lidar-scanner";
import { Button, Card, styles } from "../components/ui";
import { listElements } from "../lib/db";

export default function ElementsScreen() {
  const [elements, setElements] = useState(() => listElements());
  useFocusEffect(useCallback(() => setElements(listElements()), []));
  const lidar = LidarScanner.isLidarAvailable();

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
