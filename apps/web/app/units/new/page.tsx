import { UnitEditorPage } from "@/components/kitchu/unit-editor-page";
import { fetchKitchuData } from "@/lib/kitchu-data";
import { notFound, redirect } from "next/navigation";

export default async function NewUnitPage() {
  const data = await fetchKitchuData();
  if (!data.viewer) redirect("/connexion");
  if (data.viewer.role !== "ADMIN") notFound();
  return <UnitEditorPage {...data} initialUnit={null} />;
}
