import { RecipeEditorPage } from "@/components/kitchu/recipe-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";
import { notFound, redirect } from "next/navigation";

export default async function NewRecipePage() {
  const data = await fetchKitchuData();
  if (!data.viewer) redirect("/connexion");
  if (data.viewer.role !== "ADMIN") notFound();
  return <RecipeEditorPage {...data} initialRecipe={null} />;
}
