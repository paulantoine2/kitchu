"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/components/navigation-progress";

type KitchuRouter = ReturnType<typeof useRouter>;
type RouterPushOptions = Parameters<KitchuRouter["push"]>[1];

export function useKitchuRouter() {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();

  const push = useCallback(
    (href: string, options?: RouterPushOptions) => {
      startNavigation();
      router.push(href, options);
    },
    [router, startNavigation],
  );

  const replace = useCallback(
    (href: string, options?: RouterPushOptions) => {
      startNavigation();
      router.replace(href, options);
    },
    [router, startNavigation],
  );

  return useMemo(
    () => ({
      ...router,
      push,
      replace,
    }),
    [router, push, replace],
  );
}
