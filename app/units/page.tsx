import { UnitsListPage } from "@/components/kitchu/units-list-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function UnitsPage() {
  const data = await fetchKitchuData();
  return <UnitsListPage {...data} />;
}
