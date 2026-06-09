import { notFound } from "next/navigation";
import { RecipeEditorPage } from "@/components/kitchu/recipe-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchKitchuData();
  const recipe = data.recipes.find((entry) => entry.id === id);

  if (!recipe) {
    notFound();
  }

  return <RecipeEditorPage {...data} initialRecipe={recipe} />;
}
