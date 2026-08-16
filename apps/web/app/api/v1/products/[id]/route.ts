import { deletePrivateProduct, savePrivateProduct } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { ingredientId, ...payload } = await request.json();
    return actionResponse(await savePrivateProduct(ingredientId, { ...payload, id }));
  } catch (error) {
    return malformedRequest(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return actionResponse(await deletePrivateProduct(id));
}
