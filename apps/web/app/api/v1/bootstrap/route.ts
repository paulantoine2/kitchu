import { dataResponse } from "@/lib/api-response";
import { fetchKitchuData } from "@/lib/kitchu-data";

export async function GET() {
  return dataResponse(await fetchKitchuData());
}
