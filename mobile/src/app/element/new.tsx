import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Button, Field, styles } from "../../components/ui";
import { addElement } from "../../lib/db";

export default function NewElementScreen() {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [material, setMaterial] = useState("");

  const save = () => {
    const error = addElement({ id, name, location, material });
    if (error) return Alert.alert("Check the details", error);
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Element ID" value={id} onChangeText={setId} placeholder="GY-192" autoCapitalize="characters" autoCorrect={false} maxLength={40} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Carved limestone cornice" />
      <Field label="Location" value={location} onChangeText={setLocation} placeholder="West elevation · Bay 04" />
      <Field label="Material" value={material} onChangeText={setMaterial} placeholder="Indiana limestone" />
      <Button title="Save element" onPress={save} />
      <Button title="Cancel" kind="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}
