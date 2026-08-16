import { Stack } from "expo-router";
import { NavigationActions } from "@/components/navigation-actions";

export default function RecipesLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true, headerRight: () => <NavigationActions /> }}><Stack.Screen name="index" options={{ title: "Recettes" }} /></Stack>;
}
