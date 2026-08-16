import { Stack } from "expo-router";
import { NavigationActions } from "@/components/navigation-actions";

export default function UnitsLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true, headerRight: () => <NavigationActions /> }}><Stack.Screen name="index" options={{ title: "Unités" }} /></Stack>;
}
