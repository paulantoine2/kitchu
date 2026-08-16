import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { PrimaryButton } from "@/components/form-controls";
import { authClient } from "@/lib/auth-client";
import { useAppColors } from "@/hooks/use-app-colors";

export default function LoginScreen() {
  const colors = useAppColors();
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const signIn = async (provider: "google" | "apple") => {
    setPending(provider); setError("");
    const result = await authClient.signIn.social({ provider, callbackURL: "/recipes" });
    setPending(null);
    if (result.error) { setError(result.error.message ?? "Connexion impossible."); return; }
    router.replace("/(tabs)/recipes");
  };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 }}><Text selectable style={{ color: colors.label, fontSize: 28, fontWeight: "800", textAlign: "center" }}>Votre cuisine, rien qu’à vous</Text><Text selectable style={{ color: colors.secondaryLabel, textAlign: "center", lineHeight: 21 }}>Connectez-vous pour retrouver votre panier, vos stocks, vos prix et vos références produit.</Text><PrimaryButton disabled={pending !== null} onPress={() => signIn("google")}>{pending === "google" ? "Connexion…" : "Continuer avec Google"}</PrimaryButton><PrimaryButton disabled={pending !== null} onPress={() => signIn("apple")}>{pending === "apple" ? "Connexion…" : "Continuer avec Apple"}</PrimaryButton>{error ? <Text selectable style={{ color: colors.destructive, textAlign: "center" }}>{error}</Text> : null}</ScrollView>;
}
