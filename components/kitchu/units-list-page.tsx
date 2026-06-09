"use client";

import { useRouter } from "next/navigation";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { UnitList } from "@/components/kitchu/unit-list";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import type { KitchuAppProps } from "@/components/kitchu/types";

export function UnitsListPage(props: KitchuAppProps) {
  const router = useRouter();
  const { cartOpen, setCartOpen, cart } = useKitchuCart(props);

  return (
    <KitchuShell
      activeTab="units"
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <UnitList units={props.units} onNewUnit={() => router.push("/units/new")} />
    </KitchuShell>
  );
}
