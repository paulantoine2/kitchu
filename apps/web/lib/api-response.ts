import { NextResponse } from "next/server";

type ActionResult =
  | { ok: true; [key: string]: unknown }
  | { ok: false; error: string };

function errorStatus(message: string) {
  if (/connect|authentifi/i.test(message)) return 401;
  if (/administrateur|réservée|interdit/i.test(message)) return 403;
  if (/introuvable/i.test(message)) return 404;
  if (/existe déjà|utilisée|utilisé/i.test(message)) return 409;
  return 400;
}

export function actionResponse(result: ActionResult) {
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: `HTTP_${errorStatus(result.error)}`, message: result.error } },
      { status: errorStatus(result.error) },
    );
  }
  const data: Record<string, unknown> = { ...result };
  delete data.ok;
  return NextResponse.json({ data });
}

export function dataResponse<T>(data: T) {
  return NextResponse.json({ data });
}

export function malformedRequest(error: unknown) {
  const message = error instanceof Error ? error.message : "Requête invalide.";
  return NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
}
