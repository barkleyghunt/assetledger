import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, ScrollView, Text } from "react-native";
import { Button, Chips, Field, styles } from "../../components/ui";
import { addDefect, newId } from "../../lib/db";
import { defectPhotosDir, keepPhoto } from "../../lib/files";
import { defectTypes, severityLabels } from "../../lib/types";

// Contractor records the defect and a proposed repair. Approval is a consultant
// decision in the web app; there is no approve button on the phone.
export default function NewDefectScreen() {
  const { elementId, scanId } = useLocalSearchParams<{ elementId: string; scanId?: string }>();
  const [type, setType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("");
  const [notes, setNotes] = useState("");
  const [repair, setRepair] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera", "Camera access is needed to take photos.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9, exif: true });
    if (result.canceled || !result.assets[0]) return;
    try {
      setPhotoUri(await keepPhoto(result.assets[0].uri, defectPhotosDir(), `${newId("PH")}.jpg`));
    } catch (e) {
      Alert.alert("Photo not saved", e instanceof Error ? e.message : String(e));
    }
  };

  const save = () => {
    if (!type) return Alert.alert("Defect", "Choose a defect type.");
    if (!severity) return Alert.alert("Defect", "Choose a severity.");
    const sizeMm = size.trim() ? Number(size) : null;
    if (sizeMm != null && !(sizeMm >= 0)) return Alert.alert("Defect", "Size must be a number in millimetres.");
    addDefect({
      elementId,
      scanId: scanId ?? null,
      type,
      severity,
      location: location.trim(),
      sizeMm,
      notes: notes.trim(),
      photoUri,
      proposedRepair: repair.trim(),
    });
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.muted, { marginBottom: 12 }]}>
        {elementId}
        {scanId ? ` · linked to scan ${scanId}` : ""}
      </Text>
      <Chips label="Type" options={defectTypes.map((t) => ({ value: t, label: t }))} value={type} onChange={setType} />
      <Chips
        label="Severity"
        options={[1, 2, 3, 4, 5].map((s) => ({ value: s, label: severityLabels[s] }))}
        value={severity}
        onChange={setSeverity}
      />
      <Field label="Location on element" value={location} onChangeText={setLocation} placeholder="Left return, 2nd course" />
      <Field label="Size (mm, optional)" value={size} onChangeText={setSize} keyboardType="numeric" placeholder="Crack length, loss depth…" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Field label="Proposed repair (optional)" value={repair} onChangeText={setRepair} placeholder="Rake out and repoint, lime mortar" multiline />
      {photoUri ? <Image source={{ uri: photoUri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 10, marginBottom: 12 }} /> : null}
      <Button title={photoUri ? "Retake photo" : "Add photo"} kind="secondary" onPress={takePhoto} />
      <Button title="Save defect" onPress={save} />
      <Text style={styles.note}>Approval of the proposed repair is made by a consultant in the web app.</Text>
    </ScrollView>
  );
}
