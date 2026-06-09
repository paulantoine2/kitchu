import { notFound } from "next/navigation";
import { IngredientEditorPage } from "@/components/kitchu/ingredient-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function IngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchKitchuData();
  const ingredient = data.ingredients.find((entry) => entry.id === id);

  if (!ingredient) {
    notFound();
  }

  return <IngredientEditorPage {...data} initialIngredient={ingredient} />;
}
