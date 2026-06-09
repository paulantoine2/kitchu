import { IngredientsListPage } from "@/components/kitchu/ingredients-list-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function IngredientsPage() {
  const data = await fetchKitchuData();
  return <IngredientsListPage {...data} />;
}
