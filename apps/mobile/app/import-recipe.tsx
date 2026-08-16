import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { FormField, PrimaryButton } from "@/components/form-controls";
import { ErrorState } from "@/components/screen-state";
import { mutations, useApiMutation, useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

export default function ImportRecipeScreen() {
  const colors = useAppColors();
  const { data } = useKitchuData();
  const [url, setUrl] = useState("");
  const mutation = useApiMutation(() => mutations.importHelloFresh(url));
  if (data && data.viewer?.role !== "ADMIN") return <ErrorState error={new Error("Cet écran est réservé à l’administrateur.")} />;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}><Text selectable style={{ color: colors.secondaryLabel, lineHeight: 21 }}>Collez l’adresse d’une recette HelloFresh. Kitchu analysera les ingrédients et vous laissera vérifier le brouillon avant enregistrement.</Text><FormField label="URL HelloFresh" value={url} onChangeText={setUrl} keyboardType="url" placeholder="https://www.hellofresh.fr/recipes/…" />{mutation.error ? <Text selectable style={{ color: colors.destructive }}>{mutation.error.message}</Text> : null}<PrimaryButton disabled={mutation.isPending || !url.trim()} onPress={() => mutation.mutate(undefined, { onSuccess: (result) => router.replace({ pathname: "/recipe/edit", params: { id: "new", importData: JSON.stringify((result as { import: unknown }).import) } }) })}>{mutation.isPending ? "Analyse…" : "Analyser la recette"}</PrimaryButton></ScrollView>;
}
