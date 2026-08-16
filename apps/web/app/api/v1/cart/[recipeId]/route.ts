import { removeCartRecipe, upsertCartItem } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

type Context = { params: Promise<{ recipeId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { recipeId } = await params;
    const body = await request.json();
    return actionResponse(await upsertCartItem(recipeId, body.portions));
  } catch (error) {
    return malformedRequest(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { recipeId } = await params;
  return actionResponse(await removeCartRecipe(recipeId));
}
