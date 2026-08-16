import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { AppCard, Pill } from "@/components/app-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { SearchField } from "@/components/search-field";
import { useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

const kindLabels: Record<string, string> = { MASS: "Masse", VOLUME: "Volume", COUNT: "Comptage", PACKAGE: "Conditionnement", CUSTOM: "Personnalisée" };

export default function UnitsScreen() {
  const colors = useAppColors();
  const query = useKitchuData();
  const [search, setSearch] = useState("");
  const units = useMemo(() => (query.data?.units ?? []).filter((unit) => `${unit.name} ${unit.symbol} ${unit.code}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"))), [query.data?.units, search]);
  if (query.isLoading) return <LoadingState />;
  if (query.error && !query.data) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return <FlatList contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32, gap: 12 }} data={units} keyExtractor={(item) => item.id} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />} ListHeaderComponent={<View style={{ gap: 10 }}><SearchField value={search} onChangeText={setSearch} placeholder="Rechercher une unité" />{query.data?.viewer?.role === "ADMIN" ? <Pressable onPress={() => router.push({ pathname: "/unit/edit", params: { id: "new" } })} style={{ paddingHorizontal: 16 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>＋ Nouvelle unité</Text></Pressable> : null}</View>} ListEmptyComponent={<EmptyState title="Aucune unité" detail="Modifiez votre recherche ou ajoutez une unité." />} renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><AppCard onPress={() => router.push({ pathname: "/unit/edit", params: { id: item.id } })}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text selectable style={{ color: colors.label, fontSize: 18, fontWeight: "700" }}>{item.name}</Text><Text selectable style={{ color: colors.primary, fontSize: 18, fontWeight: "800" }}>{item.symbol}</Text></View><View style={{ flexDirection: "row", gap: 8 }}><Pill>{kindLabels[item.kind] ?? item.kind}</Pill><Pill>{item.code}</Pill></View></AppCard></View>} />;
}
