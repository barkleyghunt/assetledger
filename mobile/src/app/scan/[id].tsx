import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { LidarScanner } from "../../../modules/lidar-scanner";
import { Button, Card, Field, formatDate, Section, styles } from "../../components/ui";
import { addMeasurements, getScan, listMeasurements, recordScaleCheck, scaleDeviation } from "../../lib/db";
import { methodLabels } from "../../lib/types";

export default function ScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [version, setVersion] = useState(0);
  const scan = getScan(id);
  const [tape, setTape] = useState(scan?.refTapeMm != null ? String(scan.refTapeMm) : "");
  const [measured, setMeasured] = useState(scan?.refScanMm != null ? String(scan.refScanMm) : "");
  void version;

  if (!scan) return <Text style={[styles.body, { padding: 16 }]}>Scan not found.</Text>;
  const measurements = listMeasurements(scan.id);
  const isLidar = scan.method !== "photo-set";

  const openViewer = async () => {
    try {
      const taken = await LidarScanner.openViewer(scan.fileUri);
      if (taken.length) {
        addMeasurements(scan, taken);
        // Offer the latest measurement as the scan side of the scale check.
        if (!measured) setMeasured(String(Math.round(taken[taken.length - 1].mm)));
        setVersion((v) => v + 1);
      }
    } catch (e) {
      Alert.alert("Viewer", e instanceof Error ? e.message : String(e));
    }
  };

  const saveScale = () => {
    const t = Number(tape);
    const m = Number(measured);
    if (!(t > 0) || !(m > 0)) return Alert.alert("Scale check", "Enter both distances in millimetres.");
    recordScaleCheck(scan, t, m);
    setVersion((v) => v + 1);
  };

  const latest = getScan(scan.id)!;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{methodLabels[scan.method]}</Text>
      <Text style={styles.muted}>
        {scan.elementId} · {formatDate(scan.capturedAt)} · {scan.device}
      </Text>
      <Text style={styles.note}>
        {scan.method === "photo-set"
          ? `${scan.photoCount ?? 0} photos. Awaiting server processing into a 3D model (not built yet).`
          : scan.method === "lidar-room"
            ? `${scan.faceCount ?? 0} walls, openings and floors.`
            : `${(scan.vertexCount ?? 0).toLocaleString()} points, ${(scan.faceCount ?? 0).toLocaleString()} faces.`}
      </Text>

      {isLidar ? (
        <Section title="3D view">
          <Button title="Open 3D view and measure" onPress={openViewer} />
          {measurements.length === 0 ? <Text style={styles.muted}>No measurements yet.</Text> : null}
          {measurements.map((m) => (
            <Text key={m.id} style={styles.body}>
              {m.label}: {Math.round(m.mm).toLocaleString()} mm
            </Text>
          ))}
        </Section>
      ) : null}

      <Section title="Scale check">
        <Text style={[styles.muted, { marginBottom: 10 }]}>
          Tape one clear distance on site (e.g. a joint to joint or opening width), then measure the same points on the scan.
        </Text>
        <Field label="Tape measure (mm)" value={tape} onChangeText={setTape} keyboardType="numeric" />
        <Field label="Scan measurement (mm)" value={measured} onChangeText={setMeasured} keyboardType="numeric" />
        <Button title="Record scale check" kind="secondary" onPress={saveScale} />
        {latest.refTapeMm != null && latest.refScanMm != null ? (
          <Card>
            <Text style={styles.body}>Recorded: {scaleDeviation(latest.refTapeMm, latest.refScanMm)}</Text>
            <Text style={styles.note}>iPhone LiDAR is typically within 1–2 cm at under 5 m. Use tape or total station for fabrication dimensions.</Text>
          </Card>
        ) : null}
      </Section>

      <Section title="Defects">
        <Button
          title="Record defect from this scan"
          onPress={() => router.push({ pathname: "/defect/new", params: { elementId: scan.elementId, scanId: scan.id } })}
        />
      </Section>
    </ScrollView>
  );
}
