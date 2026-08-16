import { IngredientEditorPage } from "@/components/kitchu/ingredient-editor-page";
import { fetchIngredientPageData } from "@/lib/kitchu-data";
import { notFound, redirect } from "next/navigation";

export default async function NewIngredientPage() {
  const data = await fetchIngredientPageData();
  if (!data.viewer) redirect("/connexion");
  if (data.viewer.role !== "ADMIN") notFound();
  return <IngredientEditorPage {...data} initialIngredient={null} />;
}
