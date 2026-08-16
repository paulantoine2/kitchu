import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

export function NavigationActions() {
  const colors = useAppColors();
  const { data } = useKitchuData();
  const cartCount = data?.cartItems.length ?? 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le panier" onPress={() => router.push("/cart")}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>Panier{cartCount ? ` (${cartCount})` : ""}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le compte" onPress={() => router.push(data?.viewer ? "/account" : "/login")}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{data?.viewer ? "Compte" : "Connexion"}</Text>
      </Pressable>
    </View>
  );
}
