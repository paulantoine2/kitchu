import { notFound, redirect } from "next/navigation";
import { UnitEditorPage } from "@/components/kitchu/unit-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";
import { isHardcodedMeasurementKind } from "@/components/kitchu/unit-helpers";

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchKitchuData();
  if (!data.viewer) redirect("/connexion");
  if (data.viewer.role !== "ADMIN") notFound();
  const unit = data.units.find((entry) => entry.id === id);

  if (!unit || isHardcodedMeasurementKind(unit.kind)) {
    notFound();
  }

  return <UnitEditorPage {...data} initialUnit={unit} />;
}
