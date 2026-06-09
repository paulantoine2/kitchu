import { RecipeEditorPage } from "@/components/kitchu/recipe-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function NewRecipePage() {
  const data = await fetchKitchuData();
  return <RecipeEditorPage {...data} initialRecipe={null} />;
}
