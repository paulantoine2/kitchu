import { IngredientEditorPage } from "@/components/kitchu/ingredient-editor-page";
import { fetchIngredientPageData } from "@/lib/kitchu-data";

export default async function NewIngredientPage() {
  const data = await fetchIngredientPageData();
  return <IngredientEditorPage {...data} initialIngredient={null} />;
}
