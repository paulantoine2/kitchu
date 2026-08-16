import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { AppProvider } from "@/providers/app-provider";

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  return (
    <AppProvider>
      <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerBackTitle: "Retour" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/[id]" options={{ title: "Recette", headerLargeTitle: false }} />
          <Stack.Screen name="recipe/edit" options={{ title: "Modifier la recette", presentation: "modal" }} />
          <Stack.Screen name="ingredient/[id]" options={{ title: "Ingrédient", headerLargeTitle: false }} />
          <Stack.Screen name="ingredient/edit" options={{ title: "Modifier l’ingrédient", presentation: "modal" }} />
          <Stack.Screen name="unit/edit" options={{ title: "Modifier l’unité", presentation: "modal" }} />
          <Stack.Screen name="product/edit" options={{ title: "Produit personnel", presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.75, 1] }} />
          <Stack.Screen name="cart" options={{ title: "Panier", presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.75, 1] }} />
          <Stack.Screen name="login" options={{ title: "Connexion", presentation: "modal" }} />
          <Stack.Screen name="account" options={{ title: "Compte", presentation: "modal" }} />
          <Stack.Screen name="import-recipe" options={{ title: "Importer une recette", presentation: "formSheet", sheetGrabberVisible: true }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProvider>
  );
}
