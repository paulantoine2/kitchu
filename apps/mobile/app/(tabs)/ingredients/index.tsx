import { formatCurrency, formatNumber, productStorageLabels } from "@kitchu/domain";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View, Pressable } from "react-native";
import { AppCard, Pill } from "@/components/app-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { SearchField } from "@/components/search-field";
import { useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

export default function IngredientsScreen() {
  const colors = useAppColors();
  const query = useKitchuData();
  const [search, setSearch] = useState("");
  const ingredients = useMemo(() => (query.data?.ingredients ?? []).filter((item) => item.name.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"))), [query.data?.ingredients, search]);
  if (query.isLoading) return <LoadingState />;
  if (query.error && !query.data) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return <FlatList contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32, gap: 12 }} data={ingredients} keyExtractor={(item) => item.id} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />} ListHeaderComponent={<View style={{ gap: 10 }}><SearchField value={search} onChangeText={setSearch} placeholder="Rechercher un ingrédient" />{query.data?.viewer?.role === "ADMIN" ? <Pressable onPress={() => router.push({ pathname: "/ingredient/edit", params: { id: "new" } })} style={{ paddingHorizontal: 16 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>＋ Nouvel ingrédient</Text></Pressable> : null}</View>} ListEmptyComponent={<EmptyState title="Aucun ingrédient" detail="Modifiez votre recherche ou ajoutez un ingrédient." />} renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><AppCard onPress={() => router.push({ pathname: "/ingredient/[id]", params: { id: item.id } })}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text selectable style={{ flex: 1, color: colors.label, fontSize: 18, fontWeight: "700" }}>{item.name}</Text><Pill tone={(item.stock?.quantity ?? 0) > 0 ? "primary" : "neutral"}>{item.stock ? `${formatNumber(item.stock.quantity)} ${item.baseUnit.symbol}` : "Sans stock"}</Pill></View><Text selectable style={{ color: colors.secondaryLabel }}>{item.products.length} produit{item.products.length > 1 ? "s" : ""}{item.products[0] ? ` · ${productStorageLabels[item.products[0].storageType]}` : ""}</Text>{item.products[0] ? <Text selectable style={{ color: colors.label }}>À partir de {formatCurrency(item.products[0].priceOverride ?? item.products[0].price)}</Text> : null}</AppCard></View>} />;
}
