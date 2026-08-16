import { RecipesListPage } from "@/components/kitchu/recipes-list-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function RecipesPage() {
  const data = await fetchKitchuData();
  return <RecipesListPage {...data} />;
}
