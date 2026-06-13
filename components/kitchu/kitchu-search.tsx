"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type KitchuSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const KitchuSearchContext = createContext<KitchuSearchContextValue | null>(null);

export function KitchuSearchProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  return (
    <KitchuSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </KitchuSearchContext.Provider>
  );
}

export function useKitchuSearch() {
  const context = useContext(KitchuSearchContext);
  if (!context) {
    throw new Error("useKitchuSearch must be used within KitchuSearchProvider");
  }
  return context;
}
