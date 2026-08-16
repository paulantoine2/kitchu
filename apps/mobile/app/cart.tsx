import { formatCurrency, formatNumber, productBaseQuantity } from "@kitchu/domain";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { AppCard, Pill } from "@/components/app-card";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { mutations, useApiMutation, useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

export default function CartScreen() {
  const colors = useAppColors();
  const query = useKitchuData();
  const update = useApiMutation(({ recipeId, portions }: { recipeId: string; portions: number }) => mutations.putCart(recipeId, portions));
  const remove = useApiMutation((recipeId: string) => mutations.deleteCart(recipeId));
  const purchase = useMemo(() => {
    if (!query.data) return { lines: [], total: 0, complete: true };
    const demands = new Map<string, { ingredient: typeof query.data.ingredients[number]; quantity: number; recipes: string[] }>();
    for (const item of query.data.cartItems) {
      const recipe = query.data.recipes.find((entry) => entry.id === item.recipeId);
      if (!recipe) continue;
      for (const line of recipe.ingredients) {
        const current = demands.get(line.ingredientId) ?? { ingredient: line.ingredient, quantity: 0, recipes: [] };
        current.quantity += line.quantityPerServing * item.portions * (line.unitToBaseFactor ?? line.ingredient.units.find((entry) => entry.unitId === line.unitId)?.toBaseFactor ?? 1);
        if (!current.recipes.includes(recipe.name)) current.recipes.push(recipe.name);
        demands.set(line.ingredientId, current);
      }
    }
    let total = 0; let complete = true;
    const lines = Array.from(demands.values()).map((demand) => {
      const needed = Math.max(0, demand.quantity - (demand.ingredient.stock?.quantity ?? 0));
      const options = demand.ingredient.products.map((product) => ({ product, quantity: productBaseQuantity(product, demand.ingredient, query.data!.globalRatios, query.data!.units) })).filter((option): option is { product: typeof demand.ingredient.products[number]; quantity: number } => Boolean(option.quantity));
      const best = options.reduce<typeof options[number] | null>((selected, option) => !selected || (option.product.priceOverride ?? option.product.price) / option.quantity < (selected.product.priceOverride ?? selected.product.price) / selected.quantity ? option : selected, null);
      const count = best && needed > 0 ? Math.ceil(needed / best.quantity) : 0;
      const price = best ? count * (best.product.priceOverride ?? best.product.price) : null;
      if (needed > 0 && price === null) complete = false;
      total += price ?? 0;
      return { ...demand, needed, best, count, price, leftover: best ? Math.max(0, count * best.quantity - needed) : 0 };
    });
    return { lines, total, complete };
  }, [query]);
  if (query.isLoading) return <LoadingState />;
  if (!query.data?.viewer) return <ErrorState error={new Error("Connectez-vous pour utiliser votre panier.")} retry={() => router.replace("/login")} />;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>{query.data.cartItems.length === 0 ? <Text selectable style={{ color: colors.secondaryLabel, textAlign: "center", padding: 32 }}>Votre panier est vide.</Text> : <><Text selectable style={{ color: colors.label, fontSize: 21, fontWeight: "800" }}>Recettes</Text>{query.data.cartItems.map((item) => { const recipe = query.data!.recipes.find((entry) => entry.id === item.recipeId); return <AppCard key={item.recipeId}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: item.recipeId } })}><Text selectable style={{ color: colors.label, fontWeight: "700" }}>{recipe?.name ?? "Recette"}</Text></Pressable><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Pressable onPress={() => update.mutate({ recipeId: item.recipeId, portions: Math.max(1, item.portions - 1) })}><Text style={{ color: colors.primary, fontSize: 22 }}>−</Text></Pressable><Text selectable style={{ color: colors.label, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{item.portions}</Text><Pressable onPress={() => update.mutate({ recipeId: item.recipeId, portions: item.portions + 1 })}><Text style={{ color: colors.primary, fontSize: 22 }}>＋</Text></Pressable></View></View><Pressable onPress={() => remove.mutate(item.recipeId)}><Text style={{ color: colors.destructive }}>Retirer</Text></Pressable></AppCard>; })}<Text selectable style={{ color: colors.label, fontSize: 21, fontWeight: "800" }}>Achats</Text>{purchase.lines.map((line) => <AppCard key={line.ingredient.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Text selectable style={{ flex: 1, color: colors.label, fontWeight: "700" }}>{line.ingredient.name}</Text>{line.price !== null ? <Text selectable style={{ color: colors.label, fontWeight: "700" }}>{formatCurrency(line.price)}</Text> : <Pill tone="warning">Produit manquant</Pill>}</View>{line.best ? <Text selectable style={{ color: colors.secondaryLabel }}>{line.count} × {line.best.product.name} · besoin {formatNumber(line.needed)} {line.ingredient.baseUnit.symbol}</Text> : null}{line.leftover > 0 ? <Text selectable style={{ color: colors.secondaryLabel }}>Reste estimé : {formatNumber(line.leftover)} {line.ingredient.baseUnit.symbol}</Text> : null}<Text selectable style={{ color: colors.secondaryLabel }}>Pour {line.recipes.join(", ")}</Text></AppCard>)}<View style={{ borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 16, gap: 4 }}><Text selectable style={{ color: colors.label, fontSize: 22, fontWeight: "800" }}>Total {formatCurrency(purchase.total)}</Text>{!purchase.complete ? <Text selectable style={{ color: colors.warning }}>Total partiel : certains ingrédients n’ont pas de produit convertible.</Text> : null}</View></>}</ScrollView>;
}
