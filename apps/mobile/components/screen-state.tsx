import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useAppColors } from "@/hooks/use-app-colors";

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  const colors = useAppColors();
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}><ActivityIndicator color={colors.primary} /><Text selectable style={{ color: colors.secondaryLabel }}>{label}</Text></View>;
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const colors = useAppColors();
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}><Text selectable style={{ color: colors.destructive, textAlign: "center" }}>{message}</Text>{retry ? <Pressable onPress={retry} style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 }}><Text style={{ color: "white", fontWeight: "700" }}>Réessayer</Text></Pressable> : null}</ScrollView>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  const colors = useAppColors();
  return <View style={{ alignItems: "center", padding: 32, gap: 6 }}><Text selectable style={{ color: colors.label, fontSize: 18, fontWeight: "700" }}>{title}</Text><Text selectable style={{ color: colors.secondaryLabel, textAlign: "center" }}>{detail}</Text></View>;
}
