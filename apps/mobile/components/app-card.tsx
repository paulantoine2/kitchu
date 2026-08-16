import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppColors } from "@/hooks/use-app-colors";

export function AppCard({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) {
  const colors = useAppColors();
  const content = <View style={{ backgroundColor: colors.surface, borderColor: colors.separator, borderWidth: 1, borderRadius: 18, borderCurve: "continuous", padding: 16, gap: 8 }}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function Pill({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "primary" | "warning" }>) {
  const colors = useAppColors();
  const backgroundColor = tone === "primary" ? colors.primaryMuted : tone === "warning" ? `${colors.warning}22` : colors.surfaceMuted;
  const color = tone === "primary" ? colors.primary : tone === "warning" ? colors.warning : colors.secondaryLabel;
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor }}><Text selectable style={{ color, fontSize: 12, fontWeight: "600" }}>{children}</Text></View>;
}
