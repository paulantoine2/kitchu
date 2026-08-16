import { formatCurrency, recipeMatchPercent } from "@kitchu/domain";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { AppCard, Pill } from "@/components/app-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { SearchField } from "@/components/search-field";
import { mutations, useApiMutation, useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";
import { filterAndSortRecipes, type RecipeSort } from "@/lib/mobile-rules";

export default function RecipesScreen() {
  const colors = useAppColors();
  const query = useKitchuData();
  const cart = useApiMutation(({ id, portions }: { id: string; portions: number }) => mutations.putCart(id, portions));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<RecipeSort>("recent");
  const recipes = useMemo(
    () => filterAndSortRecipes(query.data?.recipes ?? [], search, sort),
    [query.data?.recipes, search, sort],
  );
  if (query.isLoading) return <LoadingState />;
  if (query.error && !query.data) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return <FlatList contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32, gap: 12 }} data={recipes} keyExtractor={(item) => item.id} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />} ListHeaderComponent={<View style={{ gap: 10 }}><SearchField value={search} onChangeText={setSearch} placeholder="Rechercher une recette ou un ingrédient" /><View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8 }}>{(["recent", "name", "match"] as const).map((value) => <Pressable key={value} onPress={() => setSort(value)} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: sort === value ? colors.primary : colors.surfaceMuted }}><Text style={{ color: sort === value ? "white" : colors.label }}>{value === "recent" ? "Récentes" : value === "name" ? "A–Z" : "Meilleur match"}</Text></Pressable>)}</View>{query.data?.viewer?.role === "ADMIN" ? <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 10 }}><Pressable onPress={() => router.push({ pathname: "/recipe/edit", params: { id: "new" } })}><Text style={{ color: colors.primary, fontWeight: "700" }}>＋ Nouvelle recette</Text></Pressable><Pressable onPress={() => router.push("/import-recipe")}><Text style={{ color: colors.primary, fontWeight: "700" }}>Importer</Text></Pressable></View> : null}</View>} ListEmptyComponent={<EmptyState title="Aucune recette" detail="Modifiez votre recherche ou ajoutez une recette." />} renderItem={({ item }) => { const match = recipeMatchPercent(item); const cheapest = item.ingredients.reduce<number | null>((total, line) => { const product = line.ingredient.products[0]; if (!product) return total; return (total ?? 0) + (product.priceOverride ?? product.price) * line.quantityPerServing / Math.max(product.packageQuantity, 1); }, null); return <View style={{ paddingHorizontal: 16 }}><AppCard onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: item.id } })}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text selectable numberOfLines={2} style={{ flex: 1, color: colors.label, fontSize: 18, fontWeight: "700" }}>{item.name}</Text><Pill tone={match >= 75 ? "primary" : "neutral"}>{match}% stock</Pill></View><Text selectable style={{ color: colors.secondaryLabel }}>{item.ingredients.length} ingrédient{item.ingredients.length > 1 ? "s" : ""} · {(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0)} min</Text>{cheapest !== null ? <Text selectable style={{ color: colors.label, fontWeight: "600" }}>Dès {formatCurrency(cheapest)} / portion</Text> : null}<Pressable disabled={cart.isPending} onPress={() => query.data?.viewer ? cart.mutate({ id: item.id, portions: 1 }) : router.push("/login")} style={{ alignSelf: "flex-start", paddingVertical: 6 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>Ajouter au panier</Text></Pressable></AppCard></View>; }} />;
}
