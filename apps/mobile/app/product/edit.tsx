import type { ProductStorageType } from "@kitchu/domain";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { ChoiceChips, FormField, PrimaryButton } from "@/components/form-controls";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { mutations, useApiMutation, useKitchuData } from "@/hooks/use-kitchu-data";
import { useAppColors } from "@/hooks/use-app-colors";

const storageOptions = [{ id: "FRESH" }, { id: "FROZEN" }, { id: "DRY" }] as { id: ProductStorageType }[];

export default function ProductEditScreen() {
  const colors = useAppColors();
  const { ingredientId, productId } = useLocalSearchParams<{ ingredientId: string; productId: string }>();
  const query = useKitchuData();
  const ingredient = query.data?.ingredients.find((item) => item.id === ingredientId);
  const product = ingredient?.products.find((item) => item.id === productId);
  const isPrivate = productId === "new" || product?.ownerId === query.data?.viewer?.id;
  const [store, setStore] = useState(""); const [brand, setBrand] = useState(""); const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [stock, setStock] = useState(""); const [quantity, setQuantity] = useState("1"); const [unitId, setUnitId] = useState(""); const [storageType, setStorageType] = useState<ProductStorageType>("FRESH"); const [priceOverride, setPriceOverride] = useState("");
  const savePrivate = useApiMutation((payload: Record<string, unknown>) => mutations.saveProduct(payload));
  const saveState = useApiMutation((payload: Record<string, unknown>) => mutations.saveProductState(productId, payload));
  const remove = useApiMutation(() => mutations.deleteProduct(productId));
  /* eslint-disable react-hooks/set-state-in-effect -- Hydrate the controlled draft when async catalogue data arrives. */
  useEffect(() => { if (product) { setStore(product.store); setBrand(product.brand ?? ""); setName(product.name); setPrice(String(product.catalogPrice ?? product.price)); setPriceOverride(product.priceOverride?.toString() ?? ""); setStock(product.stockQuantity?.toString() ?? ""); setQuantity(String(product.packageQuantity)); setUnitId(product.packageUnitId); setStorageType(product.storageType); } else if (ingredient) { setUnitId(ingredient.baseUnitId); } }, [ingredient, product]);
  /* eslint-enable react-hooks/set-state-in-effect */
  if (query.isLoading) return <LoadingState />;
  if (!query.data?.viewer) return <ErrorState error={new Error("Connectez-vous pour personnaliser vos produits.")} />;
  if (!ingredient) return <ErrorState error={new Error("Ingrédient introuvable.")} />;
  const error = savePrivate.error ?? saveState.error ?? remove.error;
  const save = () => { if (isPrivate) savePrivate.mutate({ id: product?.id, ingredientId, store, brand, name, storageType, packageQuantity: quantity, packageUnitId: unitId, packageToBaseFactor: "", price, stockQuantity: stock, imageUrl: "", url: "", barcode: "", notes: "", caloriesPer100g: "", proteinPer100g: "", carbsPer100g: "", fatPer100g: "" }, { onSuccess: () => router.back() }); else saveState.mutate({ stockQuantity: stock, priceOverride }, { onSuccess: () => router.back() }); };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>{isPrivate ? <><FormField label="Magasin" value={store} onChangeText={setStore} /><FormField label="Marque" value={brand} onChangeText={setBrand} /><FormField label="Nom du produit" value={name} onChangeText={setName} /><ChoiceChips label="Conservation" value={storageType} options={storageOptions} getLabel={(option) => option.id === "FRESH" ? "Frais" : option.id === "FROZEN" ? "Surgelé" : "Épicerie"} onChange={(id) => setStorageType(id as ProductStorageType)} /><View style={{ flexDirection: "row", gap: 12 }}><View style={{ flex: 1 }}><FormField label="Prix (€)" value={price} onChangeText={setPrice} keyboardType="numeric" /></View><View style={{ flex: 1 }}><FormField label="Quantité" value={quantity} onChangeText={setQuantity} keyboardType="numeric" /></View></View><ChoiceChips label="Unité du paquet" value={unitId} options={query.data.units} getLabel={(unit) => `${unit.name} (${unit.symbol})`} onChange={setUnitId} /></> : <><Text selectable style={{ color: colors.secondaryLabel }}>Référence partagée : {product?.name}. Vos valeurs restent privées.</Text><FormField label="Prix personnel (€)" value={priceOverride} onChangeText={setPriceOverride} keyboardType="numeric" /></>}<FormField label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" />{error ? <Text selectable style={{ color: colors.destructive }}>{error.message}</Text> : null}<PrimaryButton disabled={savePrivate.isPending || saveState.isPending} onPress={save}>Enregistrer</PrimaryButton>{product && isPrivate ? <PrimaryButton destructive disabled={remove.isPending} onPress={() => Alert.alert("Supprimer ce produit ?", undefined, [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }) }])}>Supprimer</PrimaryButton> : null}</ScrollView>;
}
