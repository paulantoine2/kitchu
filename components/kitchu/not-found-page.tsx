"use client";

import Link from "next/link";
import { useState } from "react";
import { FileQuestion } from "lucide-react";
import type { CartPurchaseSummary } from "@/components/kitchu/cart";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

const EMPTY_CART_SUMMARY = {
  recipeLines: [],
  productLines: [],
  totalPrice: { total: null, isComplete: false },
  leftoverValue: { total: null, isComplete: false },
} satisfies CartPurchaseSummary;

export function KitchuNotFoundPage() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <KitchuShell
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={0}
      cartSummary={EMPTY_CART_SUMMARY}
      onCartPortionsChange={() => {}}
      onCartRemoveRecipe={() => {}}
    >
      <div className="mx-auto flex max-w-[1480px] flex-1 items-center justify-center px-4 py-16 lg:px-8">
        <Empty className="max-w-md animate-fade-up rounded-2xl bg-card py-12 shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            <h1 className="text-lg font-semibold">Page introuvable</h1>
            <EmptyDescription>
              Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;adresse ou revenez à
              la liste des recettes.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/recipes" />}>
              Retour aux recettes
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </KitchuShell>
  );
}
