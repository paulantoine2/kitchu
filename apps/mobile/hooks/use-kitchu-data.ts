import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import type { KitchuAppProps } from "@kitchu/domain";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { assertOnline } from "@/lib/mobile-rules";

export const bootstrapKey = (viewerId = "guest") => ["bootstrap", viewerId] as const;

export function useKitchuData() {
  const session = authClient.useSession();
  const viewerId = session.data?.user.id ?? "guest";
  return useQuery({
    queryKey: bootstrapKey(viewerId),
    queryFn: () => apiRequest<KitchuAppProps>("/bootstrap"),
  });
}

export function useApiMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const state = await Network.getNetworkStateAsync();
      assertOnline(state.isConnected);
      return mutationFn(variables);
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return client.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });
}

export const mutations = {
  putCart: (recipeId: string, portions: number) =>
    apiRequest(`/cart/${recipeId}`, { method: "PUT", body: jsonBody({ portions }) }),
  deleteCart: (recipeId: string) => apiRequest(`/cart/${recipeId}`, { method: "DELETE" }),
  saveRecipe: (payload: Record<string, unknown>) =>
    apiRequest(payload.id ? `/recipes/${payload.id}` : "/recipes", {
      method: payload.id ? "PUT" : "POST",
      body: jsonBody(payload),
    }),
  deleteRecipe: (id: string) => apiRequest(`/recipes/${id}`, { method: "DELETE" }),
  saveIngredient: (payload: Record<string, unknown>) =>
    apiRequest(payload.id ? `/ingredients/${payload.id}` : "/ingredients", {
      method: payload.id ? "PUT" : "POST",
      body: jsonBody(payload),
    }),
  deleteIngredient: (id: string) => apiRequest(`/ingredients/${id}`, { method: "DELETE" }),
  saveUnit: (payload: Record<string, unknown>) =>
    apiRequest(payload.id ? `/units/${payload.id}` : "/units", {
      method: payload.id ? "PUT" : "POST",
      body: jsonBody(payload),
    }),
  deleteUnit: (id: string, force = false) => apiRequest(`/units/${id}?force=${force}`, { method: "DELETE" }),
  saveRatio: (payload: Record<string, unknown>) =>
    apiRequest(payload.id ? `/unit-ratios/${payload.id}` : "/unit-ratios", {
      method: payload.id ? "PUT" : "POST",
      body: jsonBody(payload),
    }),
  deleteRatio: (id: string) => apiRequest(`/unit-ratios/${id}`, { method: "DELETE" }),
  saveProduct: (payload: Record<string, unknown>) =>
    apiRequest(payload.id ? `/products/${payload.id}` : "/products", {
      method: payload.id ? "PUT" : "POST",
      body: jsonBody(payload),
    }),
  deleteProduct: (id: string) => apiRequest(`/products/${id}`, { method: "DELETE" }),
  saveProductState: (productId: string, payload: Record<string, unknown>) =>
    apiRequest(`/product-states/${productId}`, { method: "PUT", body: jsonBody(payload) }),
  importHelloFresh: (url: string) => apiRequest<{ import: unknown }>("/imports/hellofresh", { method: "POST", body: jsonBody({ url }) }),
};
