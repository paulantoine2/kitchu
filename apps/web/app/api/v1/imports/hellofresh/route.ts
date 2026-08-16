import { importHelloFreshRecipe } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    return actionResponse(await importHelloFreshRecipe(url));
  } catch (error) {
    return malformedRequest(error);
  }
}
