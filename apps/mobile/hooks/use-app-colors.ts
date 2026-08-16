import { useColorScheme } from "react-native";
import { createColors } from "@/theme/colors";

export function useAppColors() {
  return createColors(useColorScheme() === "dark");
}
