"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChefHat, Package, ShoppingCart, Utensils } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { CartSheet } from "@/components/kitchu/cart-sheet";
import type { CartPurchaseSummary } from "@/components/kitchu/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type KitchuTab = "recipes" | "ingredients" | "units";

function tabHref(tab: KitchuTab) {
  if (tab === "recipes") return "/recipes";
  if (tab === "units") return "/units";
  return "/ingredients";
}

export function KitchuShell({
  activeTab,
  cartOpen,
  onCartOpenChange,
  cartItemCount,
  cartSummary,
  onCartPortionsChange,
  onCartRemoveRecipe,
  children,
}: {
  activeTab: KitchuTab;
  cartOpen: boolean;
  onCartOpenChange: (open: boolean) => void;
  cartItemCount: number;
  cartSummary: CartPurchaseSummary;
  onCartPortionsChange: (recipeId: string, portions: number) => void;
  onCartRemoveRecipe: (recipeId: string) => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] min-w-0 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/recipes" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm md:size-11">
              <ChefHat className="size-5 md:size-6" />
            </Link>
            <div className="min-w-0">
              <p className="text-xl font-semibold tracking-normal md:text-2xl">Kitchu</p>
              <p className="hidden text-sm text-muted-foreground md:block">
                Recettes, ingrédients, unités et produits réels.
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="relative shrink-0"
              onClick={() => onCartOpenChange(true)}
              aria-label="Ouvrir le panier"
            >
              <ShoppingCart data-icon="inline-start" />
              <span className="hidden sm:inline">Panier</span>
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 size-5 justify-center rounded-full p-0 text-[10px]">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
            <ModeToggle />
            <Tabs value={activeTab} className="min-w-0 flex-1 md:flex-none">
              <TabsList className="h-auto w-full max-w-full rounded-full border border-border bg-card p-1 shadow-sm md:w-auto">
                <TabsTrigger
                  value="recipes"
                  className="flex-1 rounded-full px-2.5 md:flex-none md:px-4"
                  nativeButton={false}
                  render={
                    <Link
                      href={tabHref("recipes")}
                      aria-current={pathname.startsWith("/recipes") ? "page" : undefined}
                      aria-label="Recettes"
                    />
                  }
                >
                  <BookOpen />
                  <span className="hidden md:inline">Recettes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="ingredients"
                  className="flex-1 rounded-full px-2.5 md:flex-none md:px-4"
                  nativeButton={false}
                  render={
                    <Link
                      href={tabHref("ingredients")}
                      aria-current={pathname.startsWith("/ingredients") ? "page" : undefined}
                      aria-label="Ingrédients"
                    />
                  }
                >
                  <Utensils />
                  <span className="hidden md:inline">Ingrédients</span>
                </TabsTrigger>
                <TabsTrigger
                  value="units"
                  className="flex-1 rounded-full px-2.5 md:flex-none md:px-4"
                  nativeButton={false}
                  render={
                    <Link
                      href={tabHref("units")}
                      aria-current={pathname.startsWith("/units") ? "page" : undefined}
                      aria-label="Unités"
                    />
                  }
                >
                  <Package />
                  <span className="hidden md:inline">Unités</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {children}

      <CartSheet
        open={cartOpen}
        onOpenChange={onCartOpenChange}
        summary={cartSummary}
        onPortionsChange={onCartPortionsChange}
        onRemoveRecipe={onCartRemoveRecipe}
      />
    </main>
  );
}
