import { saveUnitRatio } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    return actionResponse(await saveUnitRatio(await request.json()));
  } catch (error) {
    return malformedRequest(error);
  }
}
