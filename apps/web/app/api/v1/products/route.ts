import { savePrivateProduct } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const { ingredientId, ...payload } = await request.json();
    return actionResponse(await savePrivateProduct(ingredientId, payload));
  } catch (error) {
    return malformedRequest(error);
  }
}
