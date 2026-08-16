import { notFound } from "next/navigation";
import { IngredientDetailPage } from "@/components/kitchu/ingredient-detail-page";
import { fetchIngredientPageData } from "@/lib/kitchu-data";

export default async function IngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchIngredientPageData(id);
  const ingredient = data.ingredients.find((entry) => entry.id === id);

  if (!ingredient) {
    notFound();
  }

  return <IngredientDetailPage {...data} ingredient={ingredient} />;
}
