import { notFound } from "next/navigation";
import { RecipeDetailPage } from "@/components/kitchu/recipe-detail-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchKitchuData();
  const recipe = data.recipes.find((entry) => entry.id === id);

  if (!recipe) {
    notFound();
  }

  return <RecipeDetailPage {...data} recipe={recipe} />;
}
