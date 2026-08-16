import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useAppColors } from "@/hooks/use-app-colors";

export function FormField({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: "default" | "numeric" | "url"; multiline?: boolean }) {
  const colors = useAppColors();
  return <View style={{ gap: 6 }}><Text style={{ color: colors.secondaryLabel, fontWeight: "600" }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondaryLabel} keyboardType={keyboardType} multiline={multiline} style={{ backgroundColor: colors.surface, color: colors.label, borderColor: colors.separator, borderWidth: 1, borderRadius: 12, borderCurve: "continuous", paddingHorizontal: 12, paddingVertical: 11, minHeight: multiline ? 92 : undefined, textAlignVertical: multiline ? "top" : "center" }} /></View>;
}

export function ChoiceChips<T extends { id: string }>({ label, value, options, getLabel, onChange }: { label: string; value: string; options: T[]; getLabel: (option: T) => string; onChange: (id: string) => void }) {
  const colors = useAppColors();
  return <View style={{ gap: 6 }}><Text style={{ color: colors.secondaryLabel, fontWeight: "600" }}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{options.map((option) => { const selected = option.id === value; return <Pressable key={option.id} onPress={() => onChange(option.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: selected ? colors.primary : colors.surfaceMuted }}><Text style={{ color: selected ? "white" : colors.label, fontWeight: "600" }}>{getLabel(option)}</Text></Pressable>; })}</ScrollView></View>;
}

export function PrimaryButton({ children, onPress, disabled = false, destructive = false }: PropsWithChildren<{ onPress: () => void; disabled?: boolean; destructive?: boolean }>) {
  const colors = useAppColors();
  return <Pressable disabled={disabled} onPress={onPress} style={{ opacity: disabled ? 0.5 : 1, alignItems: "center", backgroundColor: destructive ? colors.destructive : colors.primary, borderRadius: 14, borderCurve: "continuous", padding: 13 }}><Text style={{ color: "white", fontWeight: "700" }}>{children}</Text></Pressable>;
}
