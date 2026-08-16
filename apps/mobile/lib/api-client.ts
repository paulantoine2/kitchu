import { fetch } from "expo/fetch";
import { authClient } from "@/lib/auth-client";

const baseURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = { data: T } | { error: { code: string; message: string } };
type ApiRequestInit = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  if (!baseURL) throw new ApiError("EXPO_PUBLIC_API_URL n’est pas configurée.", 0, "CONFIGURATION");
  const cookie = authClient.getCookie();
  try {
    const response = await fetch(`${baseURL}/api/v1${path}`, {
      ...init,
      credentials: "omit",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...init.headers,
      },
    });
    const envelope = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || "error" in envelope) {
      const error = "error" in envelope ? envelope.error : { code: `HTTP_${response.status}`, message: "La requête a échoué." };
      throw new ApiError(error.message, response.status, error.code);
    }
    return envelope.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Impossible de joindre Kitchu.", 0, "NETWORK_ERROR");
  }
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}
