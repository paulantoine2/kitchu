import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import Storage from "expo-sqlite/kv-store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 7 * 24 * 60 * 60 * 1000, retry: 2 },
    mutations: { retry: false },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: Storage,
  key: "kitchu-query-cache-v1",
});

export async function clearPrivateCache() {
  queryClient.clear();
  await queryPersister.removeClient();
}
