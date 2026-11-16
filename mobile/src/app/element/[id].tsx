import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { LidarScanner } from "../../../modules/lidar-scanner";
import { Button, Card, formatDate, Section, severityColor, styles } from "../../components/ui";
import { addScan, getElement, listDefects, listEvents, listScans, newId } from "../../lib/db";
import { methodLabels } from "../../lib/types";

export default function ElementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  useFocusEffect(useCallback(() => refresh(), []));
  const [busy, setBusy] = useState(false);

  const element = getElement(id);
  if (!element) return <Text style={[styles.body, { padding: 16 }]}>Element not found.</Text>;
  const scans = listScans(element.id);
  const defects = listDefects(element.id);
  const events = listEvents(element.id);
  void version;

  const lidar = LidarScanner.isLidarAvailable();
  const room = LidarScanner.isRoomPlanAvailable();

  const runLidar = async (mode: "surface" | "room") => {
    setBusy(true);
    const scanId = newId("SCN");
    try {
      const result = await LidarScanner.startScan(mode, scanId);
      if (!result) return; // cancelled
      addScan({
        id: scanId,
        elementId: element.id,
        method: mode === "room" ? "lidar-room" : "lidar-surface",
        fileUri: result.fileUri,
        vertexCount: result.vertexCount,
        faceCount: result.faceCount,
      });
      refresh();
      router.push({ pathname: "/scan/[id]", params: { id: scanId } });
    } catch (e) {
      Alert.alert("Scan not saved", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: element.id }} />
      <Text style={styles.title}>{element.name}</Text>
      {element.location ? <Text style={styles.muted}>{element.location}</Text> : null}
      {element.material ? <Text style={styles.muted}>{element.material}</Text> : null}

      <Section title="Capture">
        {lidar ? (
          <>
            <Button title="Surface scan (LiDAR)" onPress={() => runLidar("surface")} disabled={busy} />
            {room ? <Button title="Room layout (LiDAR)" kind="secondary" onPress={() => runLidar("room")} disabled={busy} /> : null}
          </>
        ) : null}
        <Button
          title="Photo set"
          kind={lidar ? "secondary" : "primary"}
          onPress={() => router.push({ pathname: "/capture/photo-set", params: { elementId: element.id } })}
        />
        <Button title="Record defect" kind="secondary" onPress={() => router.push({ pathname: "/defect/new", params: { elementId: element.id } })} />
        {!lidar ? <Text style={styles.note}>No LiDAR on this phone. Photo sets are stored for processing later and need a scale reference in shot.</Text> : null}
      </Section>

      <Section title={`Scans (${scans.length})`}>
        {scans.length === 0 ? <Text style={styles.muted}>No scans yet.</Text> : null}
        {scans.map((s) => (
          <Card key={s.id} onPress={() => router.push({ pathname: "/scan/[id]", params: { id: s.id } })}>
            <Text style={styles.body}>{methodLabels[s.method]}</Text>
            <Text style={styles.muted}>{formatDate(s.capturedAt)}</Text>
            <Text style={styles.note}>
              {s.method === "photo-set" ? `${s.photoCount ?? 0} photos` : s.method === "lidar-room" ? `${s.faceCount ?? 0} surfaces` : `${(s.vertexCount ?? 0).toLocaleString()} points`}
              {s.refTapeMm != null ? " · scale checked" : " · no scale check"}
            </Text>
          </Card>
        ))}
      </Section>

      <Section title={`Defects (${defects.length})`}>
        {defects.length === 0 ? <Text style={styles.muted}>No defects recorded.</Text> : null}
        {defects.map((d) => (
          <Card key={d.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: severityColor(d.severity) }} />
              <Text style={styles.body}>
                {d.type} · severity {d.severity}
              </Text>
            </View>
            <Text style={styles.muted}>
              {d.location || "Location not given"}
              {d.sizeMm != null ? ` · ${d.sizeMm} mm` : ""}
            </Text>
            {d.proposedRepair ? <Text style={styles.note}>Proposed: {d.proposedRepair}</Text> : null}
            <Text style={styles.note}>Awaiting consultant review in the web app.</Text>
          </Card>
        ))}
      </Section>

      <Section title="History">
        {events.map((e) => (
          <View key={e.id} style={{ marginBottom: 10 }}>
            <Text style={styles.muted}>{formatDate(e.createdAt)}</Text>
            <Text style={styles.body}>{e.text}</Text>
          </View>
        ))}
        <Text style={styles.note}>Stored on this phone only until sync is added. Approvals are made in the web app by a consultant account.</Text>
      </Section>
    </ScrollView>
  );
}
