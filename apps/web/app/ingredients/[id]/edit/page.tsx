import { notFound, redirect } from "next/navigation";
import { IngredientEditorPage } from "@/components/kitchu/ingredient-editor-page";
import { fetchIngredientPageData } from "@/lib/kitchu-data";

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchIngredientPageData(id);
  if (!data.viewer) redirect("/connexion");
  if (data.viewer.role !== "ADMIN") notFound();
  const ingredient = data.ingredients.find((entry) => entry.id === id);
  if (!ingredient) notFound();
  return (
    <IngredientEditorPage
      {...data}
      initialIngredient={{
        ...ingredient,
        products: ingredient.products.filter((product) => product.ownerId === null),
      }}
    />
  );
}
