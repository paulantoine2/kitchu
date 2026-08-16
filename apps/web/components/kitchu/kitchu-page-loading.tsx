"use client";

import { useState } from "react";
import type { CartPurchaseSummary } from "@/components/kitchu/cart";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY_CART_SUMMARY = {
  recipeLines: [],
  productLines: [],
  totalPrice: { total: null, isComplete: false },
  leftoverValue: { total: null, isComplete: false },
} satisfies CartPurchaseSummary;

type KitchuPageLoadingVariant = "grid" | "table" | "detail";

function PageHeaderSkeleton() {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-9 w-36 rounded-md" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-2xl" />
        ))}
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-2 md:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl md:block">
        <Skeleton className="h-12 rounded-none" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="mt-px h-14 rounded-none" />
        ))}
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <Skeleton className="mb-6 aspect-[16/10] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </>
  );
}

export function KitchuPageLoading({
  variant = "grid",
}: {
  variant?: KitchuPageLoadingVariant;
}) {
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
      <div className="mx-auto max-w-page px-4 py-8 lg:px-8">
        {variant === "grid" && <GridSkeleton />}
        {variant === "table" && <TableSkeleton />}
        {variant === "detail" && <DetailSkeleton />}
      </div>
    </KitchuShell>
  );
}
