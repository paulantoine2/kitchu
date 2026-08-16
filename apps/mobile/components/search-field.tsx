import { TextInput } from "react-native";
import { useAppColors } from "@/hooks/use-app-colors";

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const colors = useAppColors();
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondaryLabel} clearButtonMode="while-editing" style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.surfaceMuted, color: colors.label, fontSize: 16 }} />;
}
