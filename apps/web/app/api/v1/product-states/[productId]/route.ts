import { saveUserProductState } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

type Context = { params: Promise<{ productId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { productId } = await params;
    return actionResponse(await saveUserProductState({ ...(await request.json()), productReferenceId: productId }));
  } catch (error) {
    return malformedRequest(error);
  }
}
