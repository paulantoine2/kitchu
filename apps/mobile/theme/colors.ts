import { Platform } from "react-native";

export type AppColors = ReturnType<typeof createColors>;

export function createColors(dark: boolean) {
  return {
    background: dark ? "#0d1117" : "#f7f8f4",
    surface: dark ? "#171d24" : "#ffffff",
    surfaceMuted: dark ? "#202832" : "#eef1eb",
    label: dark ? "#f2f5f1" : "#172019",
    secondaryLabel: dark ? "#a9b4ac" : "#657068",
    separator: dark ? "#303a44" : "#dce2da",
    primary: dark ? "#71d18d" : "#19713a",
    primaryMuted: dark ? "#183d26" : "#dff3e4",
    destructive: dark ? "#ff8a80" : "#ba1a1a",
    warning: dark ? "#ffd180" : "#8a5300",
    tabBar: Platform.select({ ios: undefined, default: dark ? "#171d24" : "#ffffff" }),
  };
}
