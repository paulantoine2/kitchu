import { IngredientEditorPage } from "@/components/kitchu/ingredient-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function NewIngredientPage() {
  const data = await fetchKitchuData();
  return <IngredientEditorPage {...data} initialIngredient={null} />;
}
