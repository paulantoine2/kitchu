"use client";

import { Plus, Save, Search, Trash2, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field as ShadcnField,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function EntityImage({
  src,
  label,
  size = "md",
  className,
}: {
  src?: string | null;
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClassName = {
    xs: "size-8 rounded-md",
    sm: "size-14 rounded-lg",
    md: "size-20 rounded-lg",
    lg: "size-32 rounded-lg",
  }[size];
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <Avatar className={cn(sizeClassName, "rounded-lg after:rounded-lg", className)}>
      {src ? <AvatarImage src={src} alt={label} className="rounded-lg" /> : null}
      <AvatarFallback className="rounded-lg bg-primary/10 font-semibold text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

export function LibraryPanel({
  title,
  searchValue,
  onSearch,
  actionLabel,
  onNew,
  children,
}: {
  title: string;
  searchValue: string;
  onSearch: (value: string) => void;
  actionLabel: string;
  onNew: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="min-h-0 min-w-0 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100dvh-6rem)]">
      <Card className="flex h-full min-h-0 max-h-[calc(100dvh-6rem)] flex-col lg:max-h-none">
        <CardHeader className="shrink-0 border-b py-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{title}</CardTitle>
            <Button variant="secondary" size="sm" onClick={onNew} aria-label={actionLabel} className="shrink-0">
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">{actionLabel}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
          <InputGroup className="shrink-0 rounded-full">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={searchValue}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Rechercher"
            />
          </InputGroup>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="flex flex-col gap-1">{children}</div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

export function LibraryListItem({
  active,
  onClick,
  media,
  title,
  description,
  warning,
}: {
  active: boolean;
  onClick: () => void;
  media: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  warning?: string;
}) {
  return (
    <Item
      variant={active ? "outline" : "default"}
      size="xs"
      className={cn(
        "w-full cursor-pointer border py-1.5 text-left transition-shadow",
        active
          ? "border-foreground bg-card shadow-md"
          : "border-transparent hover:border-border hover:bg-card hover:shadow-sm",
      )}
      render={<button type="button" onClick={onClick} />}
    >
      <ItemMedia variant="image">{media}</ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <ItemTitle className="truncate text-sm leading-tight">{title}</ItemTitle>
        {description ? <ItemDescription className="line-clamp-1">{description}</ItemDescription> : null}
      </ItemContent>
      {warning ? (
        <ItemActions className="shrink-0">
          <span className="inline-flex text-amber-500 dark:text-amber-400" title={warning} aria-label={warning}>
            <TriangleAlert className="size-4" aria-hidden="true" />
          </span>
        </ItemActions>
      ) : null}
    </Item>
  );
}

export function StickySave({
  busy,
  notice,
  onSave,
  onDelete,
}: {
  busy: boolean;
  notice: string;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="bg-card/95 py-3 shadow-lg backdrop-blur md:sticky md:bottom-4 md:z-10">
      <div className="flex flex-col gap-3 px-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 min-w-0 flex-1 text-sm text-muted-foreground">{notice || "\u00a0"}</p>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {onDelete && (
            <Button variant="outline" onClick={onDelete} disabled={busy}>
              <Trash2 data-icon="inline-start" />
              Supprimer
            </Button>
          )}
          <Button onClick={onSave} disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {busy ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Field({
  label,
  className,
  showLabel = true,
  children,
}: {
  label: string;
  className?: string;
  showLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ShadcnField className={className}>
      <FieldLabel className={showLabel ? undefined : "sr-only"}>{label}</FieldLabel>
      {children}
    </ShadcnField>
  );
}
