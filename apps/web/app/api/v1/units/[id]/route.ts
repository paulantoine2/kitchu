import { deleteUnit, saveUnit } from "@/app/actions";
import { actionResponse, malformedRequest } from "@/lib/api-response";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    return actionResponse(await saveUnit({ ...(await request.json()), id }));
  } catch (error) {
    return malformedRequest(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";
  return actionResponse(await deleteUnit(id, { force }));
}
