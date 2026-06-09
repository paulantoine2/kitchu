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
        <div className="mx-auto flex max-w-[1480px] min-w-0 flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/recipes" className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ChefHat className="size-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Kitchu</h1>
              <p className="text-sm text-muted-foreground">Recettes, ingrédients, unités et produits réels.</p>
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
              <TabsList className="h-auto w-full max-w-full overflow-x-auto rounded-full border border-border bg-card p-1 shadow-sm md:w-auto">
                <TabsTrigger
                  value="recipes"
                  className="rounded-full px-3 md:px-4"
                  nativeButton={false}
                  render={
                    <Link
                      href={tabHref("recipes")}
                      aria-current={pathname.startsWith("/recipes") ? "page" : undefined}
                    />
                  }
                >
                  <BookOpen data-icon="inline-start" />
                  Recettes
                </TabsTrigger>
                <TabsTrigger
                  value="ingredients"
                  className="rounded-full px-3 md:px-4"
                  nativeButton={false}
                  render={
                    <Link
                      href={tabHref("ingredients")}
                      aria-current={pathname.startsWith("/ingredients") ? "page" : undefined}
                    />
                  }
                >
                  <Utensils data-icon="inline-start" />
                  Ingrédients
                </TabsTrigger>
                <TabsTrigger
                  value="units"
                  className="rounded-full px-3 md:px-4"
                  nativeButton={false}
                  render={
                    <Link
                      href={tabHref("units")}
                      aria-current={pathname.startsWith("/units") ? "page" : undefined}
                    />
                  }
                >
                  <Package data-icon="inline-start" />
                  Unités
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
