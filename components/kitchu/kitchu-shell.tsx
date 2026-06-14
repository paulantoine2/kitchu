"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { CartSheet } from "@/components/kitchu/cart-sheet";
import type { CartPurchaseSummary } from "@/components/kitchu/cart";
import { KitchuSearchProvider, useKitchuSearch } from "@/components/kitchu/kitchu-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type KitchuTab = "recipes" | "ingredients" | "units";

function activeTabFromPathname(pathname: string): KitchuTab {
  if (pathname.startsWith("/units")) return "units";
  if (pathname.startsWith("/ingredients")) return "ingredients";
  return "recipes";
}

function searchPlaceholder(tab: KitchuTab) {
  if (tab === "ingredients") return "Rechercher un ingrédient…";
  if (tab === "units") return "Rechercher une unité…";
  return "Rechercher une recette…";
}

function HeaderNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function KitchuHeader({
  onCartOpenChange,
  cartItemCount,
}: {
  onCartOpenChange: (open: boolean) => void;
  cartItemCount: number;
}) {
  const pathname = usePathname();
  const activeTab = activeTabFromPathname(pathname);
  const { query, setQuery } = useKitchuSearch();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1120px] min-w-0 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Link href="/recipes" className="shrink-0 rounded-lg overflow-hidden">
            <img
              src="/kitchu-logo.png"
              alt="Kitchu"
              className="h-8 w-auto md:h-9"
            />
          </Link>

          <nav className="hidden shrink-0 items-center md:flex">
            <HeaderNavLink href="/recipes" active={activeTab === "recipes"}>
              Recettes
            </HeaderNavLink>
            <HeaderNavLink href="/ingredients" active={activeTab === "ingredients"}>
              Ingrédients
            </HeaderNavLink>
            <HeaderNavLink href="/units" active={activeTab === "units"}>
              Unités
            </HeaderNavLink>
          </nav>

          <InputGroup className="h-10 min-w-0 flex-1 rounded-full">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder(activeTab)}
              aria-label="Rechercher"
            />
          </InputGroup>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              className="relative"
              onClick={() => onCartOpenChange(true)}
              aria-label="Ouvrir le panier"
            >
              <ShoppingCart />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 size-5 justify-center rounded-full p-0 text-[10px]">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
            <ModeToggle />
          </div>
        </div>

        <nav className="mt-2 flex items-center gap-0.5 overflow-x-auto md:hidden">
          <HeaderNavLink href="/recipes" active={activeTab === "recipes"}>
            Recettes
          </HeaderNavLink>
          <HeaderNavLink href="/ingredients" active={activeTab === "ingredients"}>
            Ingrédients
          </HeaderNavLink>
          <HeaderNavLink href="/units" active={activeTab === "units"}>
            Unités
          </HeaderNavLink>
        </nav>
      </div>
    </header>
  );
}

export function KitchuShell({
  cartOpen,
  onCartOpenChange,
  cartItemCount,
  cartSummary,
  onCartPortionsChange,
  onCartRemoveRecipe,
  children,
}: {
  cartOpen: boolean;
  onCartOpenChange: (open: boolean) => void;
  cartItemCount: number;
  cartSummary: CartPurchaseSummary;
  onCartPortionsChange: (recipeId: string, portions: number) => void;
  onCartRemoveRecipe: (recipeId: string) => void;
  children: React.ReactNode;
}) {
  return (
    <KitchuSearchProvider>
      <main className="min-h-screen bg-background text-foreground">
        <KitchuHeader
          onCartOpenChange={onCartOpenChange}
          cartItemCount={cartItemCount}
        />

        {children}

        <CartSheet
          open={cartOpen}
          onOpenChange={onCartOpenChange}
          summary={cartSummary}
          onPortionsChange={onCartPortionsChange}
          onRemoveRecipe={onCartRemoveRecipe}
        />
      </main>
    </KitchuSearchProvider>
  );
}
