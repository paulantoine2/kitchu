import type { RecipeDraftIngredient } from "@kitchu/domain";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ChoiceChips, FormField, PrimaryButton } from "@/components/form-controls";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { mutations, useApiMutation, useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

const rowKey = () => Math.random().toString(36).slice(2);

export default function RecipeEditScreen() {
  const colors = useAppColors();
  const params = useLocalSearchParams<{ id?: string; importData?: string }>();
  const query = useKitchuData();
  const recipe = useMemo(() => query.data?.recipes.find((item) => item.id === params.id), [params.id, query.data?.recipes]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("");
  const [cookMinutes, setCookMinutes] = useState("");
  const [ingredients, setIngredients] = useState<RecipeDraftIngredient[]>([]);
  const [steps, setSteps] = useState<{ key: string; instruction: string }[]>([]);
  const save = useApiMutation((payload: Record<string, unknown>) => mutations.saveRecipe(payload));
  /* eslint-disable react-hooks/set-state-in-effect -- Hydrate the controlled draft when async recipe/import data arrives. */
  useEffect(() => {
    if (recipe) {
      setName(recipe.name); setDescription(recipe.description ?? ""); setImageUrl(recipe.imageUrl ?? ""); setSourceUrl(recipe.sourceUrl ?? ""); setPrepMinutes(recipe.prepMinutes?.toString() ?? ""); setCookMinutes(recipe.cookMinutes?.toString() ?? "");
      setIngredients(recipe.ingredients.map((line) => ({ key: rowKey(), ingredientId: line.ingredientId, ingredientName: line.ingredient.name, ingredientImageUrl: line.ingredient.imageUrl ?? "", unitId: line.unitId, quantityPerServing: String(line.quantityPerServing), unitToBaseFactor: line.unitToBaseFactor?.toString() ?? "", preparationWeightRatio: line.preparationWeightRatio?.toString() ?? "", note: line.note ?? "" })));
      setSteps(recipe.steps.map((step) => ({ key: rowKey(), instruction: step.instruction })));
    } else if (params.importData) {
      try {
        const imported = JSON.parse(params.importData) as { recipe: { name: string; description?: string; imageUrl?: string; sourceUrl?: string; prepMinutes?: number; cookMinutes?: number; steps?: string[] }; matches: { ingredientId: string; ingredientName: string; imageUrl?: string; unitId: string; amount: number; status: RecipeDraftIngredient["importStatus"] }[] };
        setName(imported.recipe.name); setDescription(imported.recipe.description ?? ""); setImageUrl(imported.recipe.imageUrl ?? ""); setSourceUrl(imported.recipe.sourceUrl ?? ""); setPrepMinutes(imported.recipe.prepMinutes?.toString() ?? ""); setCookMinutes(imported.recipe.cookMinutes?.toString() ?? "");
        setIngredients(imported.matches.map((line) => ({ key: rowKey(), ingredientId: line.ingredientId, ingredientName: line.ingredientName, ingredientImageUrl: line.imageUrl ?? "", unitId: line.unitId, quantityPerServing: String(line.amount), unitToBaseFactor: "", preparationWeightRatio: "", note: "", importStatus: line.status })));
        setSteps((imported.recipe.steps ?? []).map((instruction) => ({ key: rowKey(), instruction })));
      } catch { /* malformed import is ignored */ }
    }
  }, [params.importData, recipe]);
  /* eslint-enable react-hooks/set-state-in-effect */
  if (query.isLoading) return <LoadingState />;
  if (!query.data || query.data.viewer?.role !== "ADMIN") return <ErrorState error={new Error("Cet écran est réservé à l’administrateur.")} />;
  const updateIngredient = (key: string, update: Partial<RecipeDraftIngredient>) => setIngredients((rows) => rows.map((row) => row.key === key ? { ...row, ...update } : row));
  const addIngredient = () => { const ingredient = query.data.ingredients[0]; const unit = ingredient?.units[0]?.unit ?? ingredient?.baseUnit; if (!ingredient || !unit) return; setIngredients((rows) => [...rows, { key: rowKey(), ingredientId: ingredient.id, ingredientName: ingredient.name, ingredientImageUrl: ingredient.imageUrl ?? "", unitId: unit.id, quantityPerServing: "1", unitToBaseFactor: "", preparationWeightRatio: "", note: "" }]); };
  const submit = () => save.mutate({ id: recipe?.id, name, description, imageUrl, sourceUrl, prepMinutes, cookMinutes, ingredients: ingredients.map(({ ingredientId, unitId, quantityPerServing, unitToBaseFactor, preparationWeightRatio, note }) => ({ ingredientId, unitId, quantityPerServing, unitToBaseFactor, preparationWeightRatio, note })), steps: steps.map(({ instruction }) => ({ instruction })) }, { onSuccess: () => router.back() });
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 18 }}><FormField label="Titre" value={name} onChangeText={setName} /><FormField label="Description" value={description} onChangeText={setDescription} multiline /><FormField label="Image (URL)" value={imageUrl} onChangeText={setImageUrl} keyboardType="url" /><FormField label="Source (URL)" value={sourceUrl} onChangeText={setSourceUrl} keyboardType="url" /><View style={{ flexDirection: "row", gap: 12 }}><View style={{ flex: 1 }}><FormField label="Préparation (min)" value={prepMinutes} onChangeText={setPrepMinutes} keyboardType="numeric" /></View><View style={{ flex: 1 }}><FormField label="Cuisson (min)" value={cookMinutes} onChangeText={setCookMinutes} keyboardType="numeric" /></View></View><View style={{ gap: 12 }}><Text style={{ color: colors.label, fontSize: 20, fontWeight: "800" }}>Ingrédients</Text>{ingredients.map((row) => { const selected = query.data.ingredients.find((item) => item.id === row.ingredientId); const unitOptions = selected ? [selected.baseUnit, ...selected.units.map((entry) => entry.unit).filter((unit, index, all) => all.findIndex((entry) => entry.id === unit.id) === index)] : query.data.units; return <View key={row.key} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, gap: 10 }}><ChoiceChips label="Ingrédient" value={row.ingredientId} options={query.data.ingredients} getLabel={(item) => item.name} onChange={(ingredientId) => { const ingredient = query.data.ingredients.find((item) => item.id === ingredientId)!; updateIngredient(row.key, { ingredientId, ingredientName: ingredient.name, unitId: ingredient.baseUnitId }); }} /><ChoiceChips label="Unité" value={row.unitId} options={unitOptions} getLabel={(unit) => unit.symbol} onChange={(unitId) => updateIngredient(row.key, { unitId })} /><FormField label="Quantité par portion" value={row.quantityPerServing} onChangeText={(value) => updateIngredient(row.key, { quantityPerServing: value })} keyboardType="numeric" /><FormField label="Note" value={row.note} onChangeText={(value) => updateIngredient(row.key, { note: value })} /><Pressable onPress={() => setIngredients((rows) => rows.filter((item) => item.key !== row.key))}><Text style={{ color: colors.destructive, fontWeight: "700" }}>Retirer</Text></Pressable></View>; })}<Pressable onPress={addIngredient}><Text style={{ color: colors.primary, fontWeight: "700" }}>＋ Ajouter un ingrédient</Text></Pressable></View><View style={{ gap: 12 }}><Text style={{ color: colors.label, fontSize: 20, fontWeight: "800" }}>Étapes</Text>{steps.map((step, index) => <View key={step.key} style={{ gap: 6 }}><FormField label={`Étape ${index + 1}`} value={step.instruction} onChangeText={(instruction) => setSteps((rows) => rows.map((row) => row.key === step.key ? { ...row, instruction } : row))} multiline /><Pressable onPress={() => setSteps((rows) => rows.filter((row) => row.key !== step.key))}><Text style={{ color: colors.destructive }}>Retirer</Text></Pressable></View>)}<Pressable onPress={() => setSteps((rows) => [...rows, { key: rowKey(), instruction: "" }])}><Text style={{ color: colors.primary, fontWeight: "700" }}>＋ Ajouter une étape</Text></Pressable></View>{save.error ? <Text selectable style={{ color: colors.destructive }}>{save.error.message}</Text> : null}<PrimaryButton disabled={save.isPending || !name || !ingredients.length || !steps.length} onPress={submit}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</PrimaryButton></ScrollView>;
}
