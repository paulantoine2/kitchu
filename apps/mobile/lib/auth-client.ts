import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

if (!baseURL) {
  console.warn("EXPO_PUBLIC_API_URL n’est pas configurée.");
}

export const authClient = createAuthClient({
  baseURL: baseURL || "http://localhost:3000",
  plugins: [
    expoClient({
      scheme: "kitchu",
      storagePrefix: "kitchu",
      storage: SecureStore,
    }),
  ],
});
