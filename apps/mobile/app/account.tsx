import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { AppCard, Pill } from "@/components/app-card";
import { PrimaryButton } from "@/components/form-controls";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useKitchuData } from "@/hooks/use-kitchu-data";
import { authClient } from "@/lib/auth-client";
import { clearPrivateCache } from "@/lib/query-client";
import { useAppColors } from "@/hooks/use-app-colors";

export default function AccountScreen() {
  const colors = useAppColors();
  const query = useKitchuData();
  const [pending, setPending] = useState(false);
  if (query.isLoading) return <LoadingState />;
  if (!query.data?.viewer) return <ErrorState error={new Error("Vous n’êtes pas connecté.")} retry={() => router.replace("/login")} />;
  const viewer = query.data.viewer;
  const signOut = async () => { setPending(true); await authClient.signOut(); await clearPrivateCache(); setPending(false); router.replace("/(tabs)/recipes"); };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}><AppCard><Text selectable style={{ color: colors.label, fontSize: 22, fontWeight: "800" }}>{viewer.name}</Text><Text selectable style={{ color: colors.secondaryLabel }}>{viewer.email}</Text><Pill tone={viewer.role === "ADMIN" ? "primary" : "neutral"}>{viewer.role === "ADMIN" ? "Administrateur" : "Utilisateur"}</Pill></AppCard><Text selectable style={{ color: colors.secondaryLabel }}>Les données mises en cache sur cet appareil sont supprimées à la déconnexion.</Text><PrimaryButton destructive disabled={pending} onPress={signOut}>{pending ? "Déconnexion…" : "Se déconnecter"}</PrimaryButton></ScrollView>;
}
