"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { Viewer } from "@/lib/auth-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "K";
}

export function UserMenu({ viewer }: { viewer: Viewer | null }) {
  if (!viewer) {
    return (
      <Link href="/connexion" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Se connecter
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Compte de ${viewer.name}`}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar>
          {viewer.image && <AvatarImage src={viewer.image} alt="" />}
          <AvatarFallback>{initials(viewer.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-foreground">{viewer.name}</span>
            <span className="truncate font-normal">{viewer.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/recipes");
            }}
          >
            <LogOut data-icon="inline-start" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
