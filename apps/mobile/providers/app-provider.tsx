import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect } from "react";
import { queryClient, queryPersister } from "@/lib/query-client";

export function AppProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      onlineManager.setOnline(state.isConnected ?? true);
    });
    Network.getNetworkStateAsync().then((state) => onlineManager.setOnline(state.isConnected ?? true));
    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: 7 * 24 * 60 * 60 * 1000 }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
