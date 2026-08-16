import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { ChoiceChips, FormField, PrimaryButton } from "@/components/form-controls";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { mutations, useApiMutation, useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

const kinds = ["MASS", "VOLUME", "COUNT", "PACKAGE", "CUSTOM"].map((id) => ({ id }));

export default function UnitEditScreen() {
  const colors = useAppColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useKitchuData();
  const unit = useMemo(() => query.data?.units.find((item) => item.id === id), [id, query.data?.units]);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [symbol, setSymbol] = useState(""); const [kind, setKind] = useState("CUSTOM"); const [targetId, setTargetId] = useState(""); const [factor, setFactor] = useState("");
  const save = useApiMutation((payload: Record<string, unknown>) => mutations.saveUnit(payload));
  const remove = useApiMutation(() => mutations.deleteUnit(id!));
  const saveRatio = useApiMutation((payload: Record<string, unknown>) => mutations.saveRatio(payload));
  const deleteRatio = useApiMutation((ratioId: string) => mutations.deleteRatio(ratioId));
  /* eslint-disable react-hooks/set-state-in-effect -- Hydrate the controlled draft when async unit data arrives. */
  useEffect(() => { if (unit) { setName(unit.name); setCode(unit.code); setSymbol(unit.symbol); setKind(unit.kind); } if (query.data && !targetId) setTargetId(query.data.units.find((item) => item.id !== id)?.id ?? ""); }, [id, query.data, targetId, unit]);
  /* eslint-enable react-hooks/set-state-in-effect */
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState error={query.error ?? new Error("Données indisponibles.")} />;
  const isAdmin = query.data.viewer?.role === "ADMIN";
  const ratios = query.data.globalRatios.filter((ratio) => ratio.fromUnitId === id || ratio.toUnitId === id);
  if (!isAdmin && !unit) return <ErrorState error={new Error("Unité introuvable.")} />;
  if (!isAdmin && unit) return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 14 }}><Text selectable style={{ color: colors.label, fontSize: 28, fontWeight: "800" }}>{unit.name}</Text><Text selectable style={{ color: colors.primary, fontSize: 34, fontWeight: "800" }}>{unit.symbol}</Text><Text selectable style={{ color: colors.secondaryLabel }}>Code : {unit.code} · Type : {unit.kind}</Text>{ratios.map((ratio) => { const from = query.data!.units.find((item) => item.id === ratio.fromUnitId); const to = query.data!.units.find((item) => item.id === ratio.toUnitId); return <Text selectable key={ratio.id} style={{ color: colors.label }}>1 {from?.symbol} = {ratio.factor} {to?.symbol}</Text>; })}</ScrollView>;
  const submit = () => save.mutate({ id: unit?.id, name, code, symbol, kind }, { onSuccess: () => router.back() });
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}><FormField label="Nom" value={name} onChangeText={setName} /><FormField label="Code" value={code} onChangeText={setCode} /><FormField label="Symbole" value={symbol} onChangeText={setSymbol} /><ChoiceChips label="Type" value={kind} options={kinds} getLabel={(item) => item.id} onChange={setKind} />{unit ? <View style={{ gap: 12 }}><Text style={{ color: colors.label, fontSize: 20, fontWeight: "800" }}>Conversions</Text>{ratios.map((ratio) => { const from = query.data!.units.find((item) => item.id === ratio.fromUnitId); const to = query.data!.units.find((item) => item.id === ratio.toUnitId); return <View key={ratio.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, padding: 12, borderRadius: 12 }}><Text selectable style={{ color: colors.label }}>1 {from?.symbol} = {ratio.factor} {to?.symbol}</Text><Pressable onPress={() => deleteRatio.mutate(ratio.id)}><Text style={{ color: colors.destructive }}>Supprimer</Text></Pressable></View>; })}<ChoiceChips label="Vers l’unité" value={targetId} options={query.data.units.filter((item) => item.id !== id)} getLabel={(item) => `${item.name} (${item.symbol})`} onChange={setTargetId} /><FormField label="Facteur" value={factor} onChangeText={setFactor} keyboardType="numeric" /><PrimaryButton disabled={!targetId || !factor || saveRatio.isPending} onPress={() => saveRatio.mutate({ fromUnitId: id, toUnitId: targetId, factor }, { onSuccess: () => setFactor("") })}>Ajouter la conversion</PrimaryButton></View> : null}{(save.error ?? saveRatio.error ?? deleteRatio.error ?? remove.error) ? <Text selectable style={{ color: colors.destructive }}>{(save.error ?? saveRatio.error ?? deleteRatio.error ?? remove.error)?.message}</Text> : null}<PrimaryButton disabled={save.isPending || !name || !code || !symbol} onPress={submit}>Enregistrer</PrimaryButton>{unit && !["MASS", "VOLUME"].includes(unit.kind) ? <PrimaryButton destructive disabled={remove.isPending} onPress={() => Alert.alert("Supprimer cette unité ?", "Forcez la suppression uniquement si vous acceptez les impacts associés.", [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }) }, { text: "Forcer", style: "destructive", onPress: () => mutations.deleteUnit(unit.id, true).then(() => router.back()) }])}>Supprimer</PrimaryButton> : null}</ScrollView>;
}
