import { UnitEditorPage } from "@/components/kitchu/unit-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";

export default async function NewUnitPage() {
  const data = await fetchKitchuData();
  return <UnitEditorPage {...data} initialUnit={null} />;
}
