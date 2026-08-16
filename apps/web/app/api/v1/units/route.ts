import { saveUnit } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    return actionResponse(await saveUnit(await request.json()));
  } catch (error) {
    return malformedRequest(error);
  }
}
