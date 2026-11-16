import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { Button, Card, styles } from "../../components/ui";
import { addScan, newId } from "../../lib/db";
import { keepPhoto, photoSetDir, removeDir } from "../../lib/files";

const recommended = 30;

// Photo-based capture for phones without LiDAR (all Android, non-Pro iPhones).
// Photos are kept on the phone; turning them into a 3D model is a later server step.
export default function PhotoSetScreen() {
  const { elementId } = useLocalSearchParams<{ elementId: string }>();
  const scanId = useRef(newId("SCN")).current;
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera", "Camera access is needed to take photos.");
    setBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9, exif: true });
      if (result.canceled || !result.assets[0]) return;
      const n = count + 1;
      await keepPhoto(result.assets[0].uri, photoSetDir(scanId), `${String(n).padStart(3, "0")}.jpg`);
      setCount(n);
    } catch (e) {
      Alert.alert("Photo not saved", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (count === 0) return Alert.alert("Photo set", "Take at least one photo first.");
    const save = () => {
      addScan({ id: scanId, elementId, method: "photo-set", fileUri: photoSetDir(scanId).uri, photoCount: count });
      router.replace({ pathname: "/scan/[id]", params: { id: scanId } });
    };
    if (count < recommended) {
      Alert.alert("Few photos", `${count} photos taken. ${recommended}+ gives a more reliable model. Save anyway?`, [
        { text: "Keep shooting", style: "cancel" },
        { text: "Save", onPress: save },
      ]);
    } else {
      save();
    }
  };

  const cancel = () => {
    if (count === 0) {
      removeDir(photoSetDir(scanId));
      return router.back();
    }
    Alert.alert("Discard photos?", `${count} photos will be deleted.`, [
      { text: "Keep", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { removeDir(photoSetDir(scanId)); router.back(); } },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{elementId}</Text>
      <Card>
        <Text style={styles.body}>How to shoot</Text>
        <Text style={styles.note}>• Put a tape or scale bar flat on the surface in the first few shots.</Text>
        <Text style={styles.note}>• Step sideways about 1/3 of the frame between shots, keep the same distance.</Text>
        <Text style={styles.note}>• Overlap every photo by about 70%. Avoid zoom and harsh shadow.</Text>
        <Text style={styles.note}>• Cover returns and soffits from an angle.</Text>
      </Card>
      <Text style={[styles.title, { textAlign: "center", marginVertical: 16 }]}>
        {count} / {recommended}+ photos
      </Text>
      <Button title={busy ? "Saving…" : "Take photo"} onPress={takePhoto} disabled={busy} />
      <Button title="Finish set" kind="secondary" onPress={finish} disabled={busy} />
      <Button title="Cancel" kind="danger" onPress={cancel} disabled={busy} />
    </ScrollView>
  );
}
